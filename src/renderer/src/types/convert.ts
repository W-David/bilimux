import type { ProgressStatus } from '@shared/types'

export type ConvertTaskStatus = ProgressStatus | 'skipped' | 'interrupted' | 'missing'

export interface ConvertTask {
  id: string
  fileName: string
  filePath: string
  status: ConvertTaskStatus
  progress: number
  finished: boolean
  message: string
  bvid: string
  title: string
  type?: string
  uname?: string
  groupTitle?: string
  sourceDir?: string
  outputPath?: string
  runId?: string
  startedAt?: number | null
  completedAt?: number | null
  updatedAt?: number | null
  durationMs?: number | null
  fileSize?: number | null
  fileExists?: boolean
}
