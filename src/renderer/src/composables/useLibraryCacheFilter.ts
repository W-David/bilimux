import { DEFAULT_LIBRARY_CACHE_FILTER, type LibraryCacheFilter } from '@shared/library-filter'
import { onActivated, ref } from 'vue'

/** 本机缓存筛选：默认「全部」；离开页面再回来时重置。 */
export function useLibraryCacheFilter() {
  const filter = ref<LibraryCacheFilter>(DEFAULT_LIBRARY_CACHE_FILTER)

  const resetFilter = (): void => {
    filter.value = DEFAULT_LIBRARY_CACHE_FILTER
  }

  onActivated(resetFilter)

  return { filter, resetFilter }
}
