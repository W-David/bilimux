import type { FavoriteFolder } from '@shared/types'

/**
 * 统一使用 https 封面地址
 */
export const safeCover = (url?: string): string => {
  return url?.replace(/^http:\/\//, 'https://') || ''
}

/**
 * 判断收藏夹是否为私密（attr 第 0 位为 1 表示私密）
 */
export const isPrivateFolder = (folder: FavoriteFolder): boolean => {
  return ((folder.attr ?? 0) & 1) === 1
}

/**
 * 格式化创建时间
 */
export const formatDate = (timestamp?: number): string => {
  if (!timestamp) return ''
  return new Date(timestamp * 1000).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * 格式化视频时长
 */
export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (value: number): string => String(value).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

/**
 * 格式化转换耗时（毫秒）
 */
export const formatDurationMs = (ms?: number | null): string => {
  if (ms == null || ms < 0) return ''
  const totalSeconds = ms / 1000
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)}s`
  }
  const minutes = Math.floor(totalSeconds / 60)
  if (minutes < 60) {
    const seconds = Math.round(totalSeconds % 60)
    return `${minutes}m ${seconds}s`
  }
  const hours = Math.floor(minutes / 60)
  const restMinutes = minutes % 60
  return `${hours}h ${restMinutes}m`
}

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes?: number | null): string => {
  if (bytes == null || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  const digits = value >= 100 || unitIndex === 0 ? 0 : 1
  return `${value.toFixed(digits)} ${units[unitIndex]}`
}
