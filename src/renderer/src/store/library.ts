import {
  BANGUMI_PAGE_SIZE,
  FOLDER_PAGE_SIZE,
  fetchBangumiFollowPage,
  fetchCreatedFolderPage
} from '@renderer/services/library'
import { usePreferenceStore } from '@renderer/store/preference'
import type { BangumiFollowItem, FavoriteFolder } from '@shared/types'
import { defineStore } from 'pinia'
import { reactive } from 'vue'

export type LibraryTab = 'created' | 'bangumi' | 'cinema'

type PagedState<T> = {
  items: T[]
  pn: number
  hasMore: boolean
  loading: boolean
  loadingMore: boolean
  error: string
  loaded: boolean
}

function emptyPage<T>(): PagedState<T> {
  return {
    items: [],
    pn: 0,
    hasMore: false,
    loading: false,
    loadingMore: false,
    error: '',
    loaded: false
  }
}

function requireMid(): number {
  const mid = usePreferenceStore().preference['user-info']?.mid
  if (!mid) throw new Error('用户信息缺失，请先扫码登录')
  return mid
}

export const useLibraryStore = defineStore('library', () => {
  const created = reactive<PagedState<FavoriteFolder>>(emptyPage())
  const bangumi = reactive<PagedState<BangumiFollowItem>>(emptyPage())
  const cinema = reactive<PagedState<BangumiFollowItem>>(emptyPage())

  function pageOf(tab: LibraryTab): PagedState<FavoriteFolder> | PagedState<BangumiFollowItem> {
    if (tab === 'created') return created
    if (tab === 'bangumi') return bangumi
    return cinema
  }

  async function loadPage(tab: LibraryTab, pn: number, append: boolean): Promise<void> {
    const state = pageOf(tab)
    if (append) {
      if (state.loadingMore || !state.hasMore) return
      state.loadingMore = true
    } else {
      if (state.loading) return
      state.loading = true
      state.error = ''
    }

    try {
      const mid = requireMid()
      if (tab === 'created') {
        const page = await fetchCreatedFolderPage(mid, pn, FOLDER_PAGE_SIZE)
        created.items = append ? [...created.items, ...page.items] : page.items
        created.pn = pn
        created.hasMore = page.hasMore
        created.loaded = true
        created.error = ''
        return
      }
      const type = tab === 'bangumi' ? 1 : 2
      const page = await fetchBangumiFollowPage(mid, type, pn, BANGUMI_PAGE_SIZE)
      const target = tab === 'bangumi' ? bangumi : cinema
      target.items = append ? [...target.items, ...page.items] : page.items
      target.pn = pn
      target.hasMore = page.hasMore
      target.loaded = true
      target.error = ''
    } catch (error) {
      state.error = error instanceof Error ? error.message : String(error)
      if (!append) {
        state.items = []
        state.loaded = false
      }
    } finally {
      state.loading = false
      state.loadingMore = false
    }
  }

  async function ensureTab(tab: LibraryTab): Promise<void> {
    const state = pageOf(tab)
    if (state.loaded || state.loading) return
    await loadPage(tab, 1, false)
  }

  async function refreshTab(tab: LibraryTab): Promise<void> {
    const state = pageOf(tab)
    state.loaded = false
    state.hasMore = false
    state.pn = 0
    await loadPage(tab, 1, false)
  }

  async function loadMore(tab: LibraryTab): Promise<void> {
    const state = pageOf(tab)
    if (!state.loaded || !state.hasMore || state.loading || state.loadingMore) return
    await loadPage(tab, state.pn + 1, true)
  }

  function reset(): void {
    Object.assign(created, emptyPage())
    Object.assign(bangumi, emptyPage())
    Object.assign(cinema, emptyPage())
  }

  return { created, bangumi, cinema, pageOf, ensureTab, refreshTab, loadMore, reset }
})
