import { ConvertHistoryRecord, ConvertHistoryStatus, VideoTaskInfo } from '@shared/types'
import { app } from 'electron/main'
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { checkFilesExist } from '../utils'

type HistoryRow = {
  run_id: string
  run_seq: number
  bvid: string
  type: string
  title: string
  uname: string
  group_title: string
  source_dir: string
  output_path: string | null
  file_size: number
  status: ConvertHistoryStatus
  error_message: string
  duration_ms: number | null
  started_at: number | null
  completed_at: number | null
  updated_at: number
}

type EndArgs = {
  success: boolean
  message: string
  outputPath?: string
  durationMs?: number
  skipped?: boolean
}

export default class ConvertHistoryStore {
  private db: DatabaseSync

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'converts.db')
    this.db = new DatabaseSync(dbPath)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS convert_history (
        run_id TEXT NOT NULL,
        run_seq INTEGER NOT NULL DEFAULT 0,
        bvid TEXT NOT NULL PRIMARY KEY,
        type TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL DEFAULT '',
        uname TEXT NOT NULL DEFAULT '',
        group_title TEXT NOT NULL DEFAULT '',
        source_dir TEXT NOT NULL DEFAULT '',
        output_path TEXT,
        file_size INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'processing',
        error_message TEXT NOT NULL DEFAULT '',
        duration_ms INTEGER,
        started_at INTEGER,
        completed_at INTEGER,
        updated_at INTEGER NOT NULL
      )
      `)
    // 旧库迁移：补充 run_seq 列（同一运行内按扫描顺序排序用）
    const columns = this.db.prepare(`PRAGMA table_info(convert_history)`).all() as { name: string }[]
    if (!columns.some(column => column.name === 'run_seq')) {
      this.db.exec(`ALTER TABLE convert_history ADD COLUMN run_seq INTEGER NOT NULL DEFAULT 0`)
    }
    this.reconcile()
  }

  /**
   * 转换开始：写入一条 processing 记录
   */
  public markStarted(runId: string, bv: VideoTaskInfo, outputPath?: string, runSeq = 0): void {
    const now = Date.now()
    this.db
      .prepare(
        `INSERT INTO convert_history
           (run_id, run_seq, bvid, type, title, uname, group_title, source_dir, output_path, file_size, status, error_message, duration_ms, started_at, completed_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'processing', '', NULL, ?, NULL, ?)
         ON CONFLICT(bvid) DO UPDATE SET
           run_id = excluded.run_id,
           run_seq = excluded.run_seq,
           type = excluded.type,
           title = excluded.title,
           uname = excluded.uname,
           group_title = excluded.group_title,
           source_dir = excluded.source_dir,
           output_path = excluded.output_path,
           file_size = 0,
           status = 'processing',
           error_message = '',
           duration_ms = NULL,
           started_at = excluded.started_at,
           completed_at = NULL,
           updated_at = excluded.updated_at`
      )
      .run(
        runId,
        runSeq,
        bv.bvid,
        bv.type,
        bv.title,
        bv.uname,
        bv.groupTitle,
        bv.fileInfo.dirPath,
        outputPath ?? null,
        now,
        now
      )
  }

  /**
   * 转换结束：更新最终状态
   */
  public markEnded(runId: string, bvid: string, args: EndArgs): void {
    const now = Date.now()
    const status: ConvertHistoryStatus = args.skipped ? 'skipped' : args.success ? 'completed' : 'failed'
    let fileSize = 0
    const outputPath = args.outputPath ?? null
    if ((status === 'completed' || status === 'skipped') && outputPath && fs.existsSync(outputPath)) {
      try {
        fileSize = fs.statSync(outputPath).size
      } catch {
        fileSize = 0
      }
    }

    this.db
      .prepare(
        `UPDATE convert_history SET
           run_id = ?,
           output_path = ?,
           file_size = ?,
           status = ?,
           error_message = ?,
           duration_ms = ?,
           completed_at = ?,
           updated_at = ?
         WHERE bvid = ?`
      )
      .run(runId, outputPath, fileSize, status, args.message, args.durationMs ?? null, now, now, bvid)
  }

  /**
   * 查询全部转换历史：按运行开始时间倒序，同一运行内按扫描序号正序
   */
  public async list(): Promise<ConvertHistoryRecord[]> {
    const rows = this.db
      .prepare(
        `SELECT rowid AS id, run_id, run_seq, bvid, type, title, uname, group_title, source_dir, output_path,
                file_size, status, error_message, duration_ms, started_at, completed_at, updated_at
         FROM convert_history
         ORDER BY
           (SELECT MIN(started_at) FROM convert_history AS h WHERE h.run_id = convert_history.run_id) DESC,
           run_seq ASC,
           rowid DESC`
      )
      .all() as unknown as (HistoryRow & { id: number })[]

    const existence = await checkFilesExist(rows.map(row => row.output_path).filter((p): p is string => Boolean(p)))
    return rows.map(row => this.toRecord(row, existence))
  }

  /**
   * 清空全部转换历史
   */
  public clear(): void {
    this.db.exec('DELETE FROM convert_history')
  }

  /**
   * 删除单条转换记录，并删除对应产物文件
   * @param bvid 任务 bvid
   * @param filePath 优先删除的文件路径（历史记录里即为产物路径）
   */
  public remove(bvid: string, filePath?: string): void {
    const row = this.db.prepare(`SELECT output_path FROM convert_history WHERE bvid = ?`).get(bvid) as
      | { output_path: string | null }
      | undefined
    const target = filePath ?? row?.output_path
    if (target) {
      try {
        fs.rmSync(target, { force: true })
      } catch {
        // 文件可能已被移动/删除，忽略即可
      }
    }
    this.db.prepare(`DELETE FROM convert_history WHERE bvid = ?`).run(bvid)
  }

  /**
   * 对账：残留的 processing 标记为 interrupted；completed 产物丢失标记为 missing
   */
  public reconcile(): void {
    const now = Date.now()
    this.db
      .prepare(
        `UPDATE convert_history SET status = 'interrupted', completed_at = ?, updated_at = ?
         WHERE status = 'processing'`
      )
      .run(now, now)

    const rows = this.db
      .prepare(`SELECT rowid AS id, output_path FROM convert_history WHERE status = 'completed'`)
      .all() as unknown as Pick<HistoryRow & { id: number }, 'id' | 'output_path'>[]

    for (const row of rows) {
      const exists = row.output_path ? fs.existsSync(row.output_path) : false
      if (!exists) {
        this.db
          .prepare(`UPDATE convert_history SET status = 'missing', updated_at = ? WHERE rowid = ?`)
          .run(now, row.id)
      }
    }
  }

  private toRecord(row: HistoryRow & { id: number }, existence: Map<string, boolean>): ConvertHistoryRecord {
    let fileExists: boolean | undefined
    let status = row.status
    if (row.output_path) {
      fileExists = existence.get(row.output_path) ?? false
      if (status === 'completed' && !fileExists) {
        status = 'missing'
      }
    }

    return {
      id: row.id,
      runId: row.run_id,
      runSeq: row.run_seq,
      bvid: row.bvid,
      type: row.type,
      title: row.title,
      uname: row.uname,
      groupTitle: row.group_title,
      sourceDir: row.source_dir,
      outputPath: row.output_path,
      fileSize: row.file_size,
      status,
      errorMessage: row.error_message,
      durationMs: row.duration_ms,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      updatedAt: row.updated_at,
      fileExists
    }
  }
}
