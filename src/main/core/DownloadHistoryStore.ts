import { DownloadHistoryRecord, DownloadHistoryStatus } from '@shared/types'
import { app } from 'electron/main'
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import logger from './Logger'

type HistoryRow = {
  bvid: string
  title: string
  folder_name: string
  output_path: string | null
  file_size: number
  status: DownloadHistoryStatus
  downloaded_at: number | null
  updated_at: number
}

export default class DownloadHistoryStore {
  private db: DatabaseSync

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'downloads.db')
    this.db = new DatabaseSync(dbPath)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS download_history (
        bvid TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        folder_name TEXT NOT NULL DEFAULT '',
        output_path TEXT,
        file_size INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'downloading',
        downloaded_at INTEGER,
        updated_at INTEGER NOT NULL
      )
    `)
    logger.info(this.constructor.name, `sqlite history ready: ${dbPath}`)
    this.reconcile()
  }

  /**
   * 下载开始：写入/重置一条 downloading 记录
   */
  public markStarted(bvid: string, title: string, folderName: string): void {
    const now = Date.now()
    this.db
      .prepare(
        `INSERT INTO download_history (bvid, title, folder_name, output_path, file_size, status, downloaded_at, updated_at)
         VALUES (?, ?, ?, NULL, 0, 'downloading', NULL, ?)
         ON CONFLICT(bvid) DO UPDATE SET
           title = excluded.title,
           folder_name = excluded.folder_name,
           output_path = NULL,
           file_size = 0,
           status = 'downloading',
           downloaded_at = NULL,
           updated_at = excluded.updated_at`
      )
      .run(bvid, title, folderName, now)
  }

  /**
   * 下载完成：记录最终路径与大小
   */
  public markCompleted(bvid: string, outputPath: string, fileSize: number): void {
    const now = Date.now()
    this.db
      .prepare(
        `INSERT INTO download_history (bvid, title, folder_name, output_path, file_size, status, downloaded_at, updated_at)
         VALUES (?, '', '', ?, ?, 'completed', ?, ?)
         ON CONFLICT(bvid) DO UPDATE SET
           output_path = excluded.output_path,
           file_size = excluded.file_size,
           status = 'completed',
           downloaded_at = excluded.downloaded_at,
           updated_at = excluded.updated_at`
      )
      .run(bvid, outputPath, fileSize, now, now)
  }

  /**
   * 下载失败：仅更新状态
   */
  public markFailed(bvid: string): void {
    this.db
      .prepare(`UPDATE download_history SET status = 'failed', updated_at = ? WHERE bvid = ?`)
      .run(Date.now(), bvid)
  }

  /**
   * 按 bvid 批量查询下载历史，已完成记录附带文件存在性校验
   */
  public getMany(bvids: string[]): DownloadHistoryRecord[] {
    if (bvids.length === 0) return []
    const placeholders = bvids.map(() => '?').join(', ')
    const rows = this.db
      .prepare(
        `SELECT bvid, title, folder_name, output_path, file_size, status, downloaded_at, updated_at
         FROM download_history
         WHERE bvid IN (${placeholders})`
      )
      .all(...bvids) as unknown as HistoryRow[]

    return rows.map(row => this.toRecord(row))
  }

  /**
   * 查询单个下载历史
   */
  public getByBvid(bvid: string): DownloadHistoryRecord | null {
    const rows = this.getMany([bvid])
    return rows[0] ?? null
  }

  /**
   * 清空全部下载历史
   */
  public clear(): void {
    this.db.exec('DELETE FROM download_history')
  }

  /**
   * 对账：已完成但文件丢失的降级为 missing，文件找回的恢复为 completed
   */
  public reconcile(): void {
    const rows = this.db
      .prepare(
        `SELECT bvid, output_path, file_size, status FROM download_history WHERE status IN ('completed', 'missing')`
      )
      .all() as unknown as Pick<HistoryRow, 'bvid' | 'output_path' | 'file_size' | 'status'>[]

    for (const row of rows) {
      const exists = row.output_path ? fs.existsSync(row.output_path) : false
      if (row.status === 'completed' && !exists) {
        this.db
          .prepare(`UPDATE download_history SET status = 'missing', updated_at = ? WHERE bvid = ?`)
          .run(Date.now(), row.bvid)
      } else if (row.status === 'missing' && exists) {
        const size = row.file_size > 0 ? row.file_size : row.output_path ? fs.statSync(row.output_path).size : 0
        this.markCompleted(row.bvid, row.output_path ?? '', size)
      }
    }
  }

  private toRecord(row: HistoryRow): DownloadHistoryRecord {
    let fileExists: boolean | undefined
    if (row.output_path) {
      fileExists = fs.existsSync(row.output_path)
    }
    return {
      bvid: row.bvid,
      title: row.title,
      folderName: row.folder_name,
      outputPath: row.output_path,
      fileSize: row.file_size,
      status: row.status,
      downloadedAt: row.downloaded_at,
      updatedAt: row.updated_at,
      fileExists
    }
  }
}
