import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'

export type FavoritesFetchPhase = 'list' | 'folder' | 'done'

export type FavoritesFetchProgressState = {
  running: boolean
  phase: FavoritesFetchPhase
  percent: number
  currentFolderIndex: number
  totalFolders: number
  currentFolderTitle: string
  currentVideoPage: number
}

/**
 * 收藏全量预拉已移除。保留 running / progress 给旧 toast 组件，恒为空闲。
 */
export const useFavoritesStore = defineStore('favorites', () => {
  const progress = reactive<FavoritesFetchProgressState>({
    running: false,
    phase: 'done',
    percent: 0,
    currentFolderIndex: 0,
    totalFolders: 0,
    currentFolderTitle: '',
    currentVideoPage: 0
  })
  const running = computed(() => progress.running)
  return { progress, running }
})
