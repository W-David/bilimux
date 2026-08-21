import type { DownloadTaskRow } from '@renderer/store/download'
import type { ConvertTask } from '@renderer/types/convert'
import { formatDuration, formatDurationMs, formatFileSize, formatTimestamp } from '@renderer/utils/media'

export type TaskDetailRow = { label: string; value: string }

const CONVERT_STATUS_TEXT: Record<string, string> = {
  importing: '导入中',
  writing: '写入中',
  preprocess: '预处理',
  success: '已完成',
  fail: '出错了',
  skipped: '已跳过',
  interrupted: '转换中断',
  missing: '文件丢失',
  waiting: '等待中',
  scanned: '缓存扫描'
}

const LIVE_STATUS_TEXT: Record<string, string> = {
  idle: '未开始',
  waiting: '等待中',
  downloading: '下载中',
  paused: '已暂停',
  preprocess: '合成中',
  importing: '合成中',
  writing: '合成中',
  success: '已完成',
  fail: '失败'
}

const HISTORY_STATUS_TEXT: Record<string, string> = {
  downloading: '下载中',
  completed: '已完成',
  failed: '失败',
  missing: '文件丢失',
  interrupted: '下载中断',
  cancelled: '已取消'
}

const typeText = (type?: string): string => {
  if (type === 'ugc') return 'UGC 视频'
  if (type === 'ogv') return 'OGV 剧集'
  return type || '—'
}

export function convertDetailRows(task: ConvertTask): TaskDetailRow[] {
  return [
    { label: '标题', value: task.title || '—' },
    { label: 'BVID', value: task.bvid || '—' },
    { label: '视频类型', value: typeText(task.type) },
    { label: '文件名', value: task.fileName || '—' },
    { label: '状态', value: CONVERT_STATUS_TEXT[task.status] || task.status },
    { label: 'UP 主', value: task.uname || '—' },
    { label: '收藏夹', value: task.groupTitle || '—' },
    { label: '源目录', value: task.sourceDir || '—' },
    { label: '源文件', value: task.filePath || '—' },
    { label: '输出文件', value: task.outputPath || '—' },
    { label: '文件大小', value: formatFileSize(task.fileSize) || '—' },
    { label: '转换耗时', value: formatDurationMs(task.durationMs) || '—' },
    { label: '开始时间', value: formatTimestamp(task.startedAt) },
    { label: '完成时间', value: formatTimestamp(task.completedAt) },
    { label: '更新时间', value: formatTimestamp(task.updatedAt) }
  ]
}

export function downloadDetailRows(
  row: DownloadTaskRow,
  live: { status: string; progress: number; message: string; outputPath: string }
): TaskDetailRow[] {
  const history = row.history
  const outputPath = live.outputPath || history?.outputPath || ''
  const fileName = outputPath.split(/[\\/]/).pop() || '—'
  const duration = row.page.duration || row.video.duration
  const partName = row.page.part?.trim()
  const partText = partName ? `P${row.page.page} ${partName}` : `P${row.page.page}`
  const statusText =
    live.status !== 'idle'
      ? LIVE_STATUS_TEXT[live.status] || live.status
      : history
        ? HISTORY_STATUS_TEXT[history.status] || history.status
        : '—'

  const list: TaskDetailRow[] = [
    { label: '标题', value: row.video.title || '—' },
    { label: 'BVID', value: row.video.bvid || '—' },
    { label: 'CID', value: String(row.page.cid || '—') },
    { label: '分P', value: partText },
    { label: '总集数', value: row.pagesTotal > 0 ? `${row.pagesTotal}P` : '—' },
    { label: '时长', value: duration ? formatDuration(duration) : '—' },
    { label: 'UP 主', value: row.video.upper.name || '—' },
    { label: '收藏夹', value: row.folderName || '—' },
    { label: '状态', value: statusText }
  ]

  if (live.message) list.push({ label: '说明', value: live.message })
  if (live.status !== 'idle' && live.status !== 'success') {
    list.push({ label: '进度', value: `${live.progress}%` })
  }

  const fileExists = history?.fileExists
  list.push(
    { label: '文件名', value: fileName },
    { label: '保存路径', value: outputPath || '—' },
    { label: '文件大小', value: formatFileSize(history?.fileSize ?? null) || '—' },
    { label: '文件存在', value: fileExists == null ? '未知' : fileExists ? '是' : '否' },
    { label: '下载时间', value: formatTimestamp(history?.downloadedAt) },
    { label: '更新时间', value: formatTimestamp(history?.updatedAt) }
  )
  return list
}
