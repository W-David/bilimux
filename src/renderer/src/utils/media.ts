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
