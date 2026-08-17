import { DownloadHistoryRecord, DownloadHistoryStatus, DownloadTaskKey, DownloadVideoTask } from '@shared/types'
import { app } from 'electron/main'
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { checkFilesExist } from '../utils'

type HistoryRow = {
  bvid: string
  cid: number
  page: number
  part: string
  title: string
  folder_name: string
  output_path: string | null
  file_size: number
  status: DownloadHistoryStatus
  downloaded_at: number | null
  updated_at: number
}

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS download_history (
    bvid TEXT NOT NULL,
    cid INTEGER NOT NULL,
    page INTEGER NOT NULL DEFAULT 1,
    part TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    folder_name TEXT NOT NULL DEFAULT '',
    output_path TEXT,
    file_size INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'downloading',
    downloaded_at INTEGER,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (bvid, cid)
  )
`

export default class DownloadHistoryStore {
  private db: DatabaseSync

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'downloads.db')
    this.db = new DatabaseSync(dbPath)
    this.db.exec(CREATE_TABLE_SQL)
    this.migrateToCidPrimaryKey()
    this.reconcile()
  }

  /**
   * 旧库主键只有 bvid，迁移为 (bvid, cid)；旧记录 cid=0
   */
  private migrateToCidPrimaryKey(): void {
    const columns = this.db.prepare(`PRAGMA table_info(download_history)`).all() as { name: string }[]
    if (columns.some(column => column.name === 'cid')) return

    this.db.exec('BEGIN')
    try {
      this.db.exec(`
        CREATE TABLE download_history_v2 (
          bvid TEXT NOT NULL,
          cid INTEGER NOT NULL,
          page INTEGER NOT NULL DEFAULT 1,
          part TEXT NOT NULL DEFAULT '',
          title TEXT NOT NULL DEFAULT '',
          folder_name TEXT NOT NULL DEFAULT '',
          output_path TEXT,
          file_size INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'downloading',
          downloaded_at INTEGER,
          updated_at INTEGER NOT NULL,
          PRIMARY KEY (bvid, cid)
        )
      `)
      this.db.exec(`
        INSERT INTO download_history_v2 (
          bvid, cid, page, part, title, folder_name, output_path, file_size, status, downloaded_at, updated_at
        )
        SELECT bvid, 0, 1, '', title, folder_name, output_path, file_size, status, downloaded_at, updated_at
        FROM download_history
      `)
      this.db.exec('DROP TABLE download_history')
      this.db.exec('ALTER TABLE download_history_v2 RENAME TO download_history')
      this.db.exec('COMMIT')
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  /**
   * 下载开始：写入/重置一条 downloading 记录
   */
  public markStarted(task: DownloadVideoTask): void {
    const now = Date.now()
    this.db.exec('BEGIN')
    try {
      if (task.cid !== 0) {
        this.db.prepare(`DELETE FROM download_history WHERE bvid = ? AND cid = 0`).run(task.bvid)
      }
      this.db
        .prepare(
          `INSERT INTO download_history (
             bvid, cid, page, part, title, folder_name, output_path, file_size, status, downloaded_at, updated_at
           )
           VALUES (?, ?, ?, ?, ?, ?, NULL, 0, 'downloading', NULL, ?)
           ON CONFLICT(bvid, cid) DO UPDATE SET
             page = excluded.page,
             part = excluded.part,
             title = excluded.title,
             folder_name = excluded.folder_name,
             output_path = NULL,
             file_size = 0,
             status = 'downloading',
             downloaded_at = NULL,
             updated_at = excluded.updated_at`
        )
        .run(task.bvid, task.cid, task.page, task.part, task.title, task.folderName, now)
      this.db.exec('COMMIT')
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  /**
   * 下载完成：记录最终路径与大小
   */
  public markCompleted(key: DownloadTaskKey, outputPath: string, fileSize: number): void {
    const now = Date.now()
    this.db
      .prepare(
        `INSERT INTO download_history (
           bvid, cid, page, part, title, folder_name, output_path, file_size, status, downloaded_at, updated_at
         )
         VALUES (?, ?, 1, '', '', '', ?, ?, 'completed', ?, ?)
         ON CONFLICT(bvid, cid) DO UPDATE SET
           output_path = excluded.output_path,
           file_size = excluded.file_size,
           status = 'completed',
           downloaded_at = excluded.downloaded_at,
           updated_at = excluded.updated_at`
      )
      .run(key.bvid, key.cid, outputPath, fileSize, now, now)
  }

  /**
   * 下载失败：仅更新状态
   */
  public markFailed(key: DownloadTaskKey): void {
    this.updateStatus(key, 'failed')
  }

  public markCancelled(key: DownloadTaskKey): void {
    this.updateStatus(key, 'cancelled')
  }

  /**
   * 按 bvid 批量查询下载历史（含全部分 P），已完成记录附带文件存在性校验
   */
  public async getMany(bvids: string[]): Promise<DownloadHistoryRecord[]> {
    if (bvids.length === 0) return []
    const placeholders = bvids.map(() => '?').join(', ')
    const rows = this.db
      .prepare(
        `SELECT bvid, cid, page, part, title, folder_name, output_path, file_size, status, downloaded_at, updated_at
         FROM download_history
         WHERE bvid IN (${placeholders})`
      )
      .all(...bvids) as unknown as HistoryRow[]

    return this.toRecords(rows)
  }

  /**
   * 列出全部下载历史
   */
  public async listAll(): Promise<DownloadHistoryRecord[]> {
    const rows = this.db
      .prepare(
        `SELECT bvid, cid, page, part, title, folder_name, output_path, file_size, status, downloaded_at, updated_at
         FROM download_history
         ORDER BY updated_at DESC`
      )
      .all() as unknown as HistoryRow[]
    return this.toRecords(rows)
  }

  /**
   * 查询单条下载历史
   */
  public async getByKey(key: DownloadTaskKey): Promise<DownloadHistoryRecord | null> {
    const row = this.db
      .prepare(
        `SELECT bvid, cid, page, part, title, folder_name, output_path, file_size, status, downloaded_at, updated_at
         FROM download_history
         WHERE bvid = ? AND cid = ?`
      )
      .get(key.bvid, key.cid) as unknown as HistoryRow | undefined
    if (!row) return null
    const existence = await checkFilesExist(row.output_path ? [row.output_path] : [])
    return this.toRecord(row, existence)
  }

  /**
   * 删除单集记录，并删除对应产物文件
   */
  public remove(key: DownloadTaskKey): void {
    const row = this.db
      .prepare(`SELECT output_path FROM download_history WHERE bvid = ? AND cid = ?`)
      .get(key.bvid, key.cid) as { output_path: string | null } | undefined
    if (row?.output_path) {
      try {
        fs.rmSync(row.output_path, { force: true })
      } catch {
        // 文件可能已被移动/删除
      }
    }
    this.db.prepare(`DELETE FROM download_history WHERE bvid = ? AND cid = ?`).run(key.bvid, key.cid)
  }

  /**
   * 清空全部下载历史
   */
  public clear(): void {
    this.db.exec('DELETE FROM download_history')
  }

  private async toRecords(rows: HistoryRow[]): Promise<DownloadHistoryRecord[]> {
    const existence = await checkFilesExist(rows.map(row => row.output_path).filter((p): p is string => Boolean(p)))
    return rows.map(row => this.toRecord(row, existence))
  }

  /**
   * 对账：残留的 downloading 标为 interrupted；
   * 已完成但文件丢失的降级为 missing，文件找回的恢复为 completed
   */
  public reconcile(): void {
    const now = Date.now()
    this.db
      .prepare(`UPDATE download_history SET status = 'interrupted', updated_at = ? WHERE status = 'downloading'`)
      .run(now)

    const rows = this.db
      .prepare(
        `SELECT bvid, cid, output_path, file_size, status FROM download_history WHERE status IN ('completed', 'missing')`
      )
      .all() as unknown as Pick<HistoryRow, 'bvid' | 'cid' | 'output_path' | 'file_size' | 'status'>[]

    for (const row of rows) {
      const exists = row.output_path ? fs.existsSync(row.output_path) : false
      if (row.status === 'completed' && !exists) {
        this.db
          .prepare(`UPDATE download_history SET status = 'missing', updated_at = ? WHERE bvid = ? AND cid = ?`)
          .run(Date.now(), row.bvid, row.cid)
      } else if (row.status === 'missing' && exists) {
        const size = row.file_size > 0 ? row.file_size : row.output_path ? fs.statSync(row.output_path).size : 0
        this.markCompleted({ bvid: row.bvid, cid: row.cid }, row.output_path ?? '', size)
      }
    }
  }

  private updateStatus(key: DownloadTaskKey, status: Extract<DownloadHistoryStatus, 'failed' | 'cancelled'>): void {
    this.db
      .prepare(`UPDATE download_history SET status = ?, updated_at = ? WHERE bvid = ? AND cid = ?`)
      .run(status, Date.now(), key.bvid, key.cid)
  }

  private toRecord(row: HistoryRow, existence: Map<string, boolean>): DownloadHistoryRecord {
    let fileExists: boolean | undefined
    if (row.output_path) {
      fileExists = existence.get(row.output_path) ?? false
    }
    return {
      bvid: row.bvid,
      cid: row.cid,
      page: row.page,
      part: row.part,
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
