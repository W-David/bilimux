export const LIBRARY_CACHE_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'downloaded', label: '已完成' },
  { value: 'undownloaded', label: '待转换' }
] as const

export type LibraryCacheFilter = (typeof LIBRARY_CACHE_FILTERS)[number]['value']

export const DEFAULT_LIBRARY_CACHE_FILTER: LibraryCacheFilter = 'all'

export type LibraryCacheStatus = 'downloaded' | 'undownloaded'

export function isLibraryCacheFilter(value: unknown): value is LibraryCacheFilter {
  return LIBRARY_CACHE_FILTERS.some(option => option.value === value)
}

export function matchesLibraryCacheFilter(filter: LibraryCacheFilter, status: LibraryCacheStatus): boolean {
  if (filter === 'all') return true
  return filter === status
}

const CONVERT_DONE = new Set(['success', 'skipped'])

export function convertStatusToCacheFilter(status: string): LibraryCacheStatus {
  return CONVERT_DONE.has(status) ? 'downloaded' : 'undownloaded'
}
