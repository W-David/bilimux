export const LIBRARY_DOWNLOAD_FILTERS = [
  { value: 'downloaded', label: '已下载' },
  { value: 'undownloaded', label: '未下载' },
  { value: 'downloading', label: '正在下载' },
  { value: 'all', label: '全部' }
] as const

export type LibraryDownloadFilter = (typeof LIBRARY_DOWNLOAD_FILTERS)[number]['value']

export type LibraryDownloadStatus = 'downloaded' | 'undownloaded' | 'downloading'

export type LibraryFilterTab = 'library-created' | 'library-bangumi' | 'library-cinema' | 'library-cache'

export function isLibraryFilterTab(name: unknown): name is LibraryFilterTab {
  return (
    name === 'library-created' || name === 'library-bangumi' || name === 'library-cinema' || name === 'library-cache'
  )
}

export function downloadFilterStatusFromBadge(badge: {
  status: 'idle' | 'active' | 'partial' | 'completed'
}): LibraryDownloadStatus {
  if (badge.status === 'active') return 'downloading'
  if (badge.status === 'completed') return 'downloaded'
  return 'undownloaded'
}

export function matchesLibraryDownloadFilter(filter: LibraryDownloadFilter, status: LibraryDownloadStatus): boolean {
  if (filter === 'all') return true
  return filter === status
}

const CONVERT_DOWNLOADING = new Set(['waiting', 'preprocess', 'importing', 'writing'])
const CONVERT_DOWNLOADED = new Set(['success', 'skipped'])

export function convertStatusToDownloadFilter(status: string): LibraryDownloadStatus {
  if (CONVERT_DOWNLOADING.has(status)) return 'downloading'
  if (CONVERT_DOWNLOADED.has(status)) return 'downloaded'
  return 'undownloaded'
}
