import type { FavoriteFolder } from '@shared/types'

/**
 * 统一使用 https 封面地址
 */
export const safeCover = (url?: string): string => {
  if (!url) return ''
  if (url.startsWith('//')) return `https:${url}`
  return url.replace(/^http:\/\//, 'https://')
}

/**
 * 判断收藏夹是否为私密（attr 第 0 位为 1 表示私密）
 */
export const isPrivateFolder = (folder: FavoriteFolder): boolean => {
  return ((folder.attr ?? 0) & 1) === 1
}

/**
 * 毫秒时间戳 → YYYY-MM-DD HH:mm
 */
export const formatTimestamp = (timestamp?: number | null): string => {
  if (!timestamp) return '—'
  const date = new Date(timestamp)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * 格式化创建时间
 */
export const formatDate = (timestamp?: number): string => {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 播放量 / 弹幕数：1.1万
 */
export const formatCount = (value?: number): string => {
  if (value == null || !Number.isFinite(value)) return ''
  if (value >= 100_000_000) {
    const text = (value / 100_000_000).toFixed(1).replace(/\.0$/, '')
    return `${text}亿`
  }
  if (value >= 10_000) {
    const text = (value / 10_000).toFixed(1).replace(/\.0$/, '')
    return `${text}万`
  }
  return String(Math.trunc(value))
}

/**
 * 卡片上的短日期：8-16
 */
export const formatShortDate = (timestamp?: number): string => {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  return `${date.getMonth() + 1}-${date.getDate()}`
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
  if (ms >= 60 * 1000) {
    return `${Math.round(ms / (60 * 1000))}m`
  }
  if (ms >= 1000) {
    return `${Math.round(ms / 1000)}s`
  }
  return `${ms}ms`
}

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes?: number | null): string => {
  if (bytes == null || bytes <= 0) return ''
  const units = ['b', 'Kb', 'Mb', 'Gb']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  const digits = value >= 100 || unitIndex === 0 ? 0 : 1
  return `${value.toFixed(digits)} ${units[unitIndex]}`
}
