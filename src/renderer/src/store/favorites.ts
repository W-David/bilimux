import { fetchAllFavorites, type FavoritesFetchProgress } from '@renderer/services/favorites'
import { fetchCurrentUserInfo } from '@renderer/services/user'
import { usePreferenceStore } from '@renderer/store/preference'
import type { FavoritesData } from '@shared/types'
import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'

const idleProgress = (): FavoritesFetchProgress => ({
  running: false,
  phase: 'done',
  percent: 0,
  currentFolderIndex: 0,
  totalFolders: 0,
  currentFolderTitle: '',
  currentVideoPage: 0
})

/**
 * 收藏夹刷新全局 store：统一管理一次性获取的进度状态与触发入口，
 * 下载页和设置页共用同一份进度，避免各自维护
 */
export const useFavoritesStore = defineStore('favorites', () => {
  const progress = reactive<FavoritesFetchProgress>(idleProgress())
  const running = computed(() => progress.running)

  /**
   * 刷新收藏夹缓存：读取用户 mid（缺失时兜底获取并持久化用户信息），
   * 拉取全部收藏夹数据并写入 preference store 持久化
   */
  async function refreshAllFavorites(): Promise<FavoritesData> {
    if (progress.running) {
      throw new Error('正在刷新中，请稍候')
    }

    const preferenceStore = usePreferenceStore()
    let userInfo = preferenceStore.preference['user-info']
    if (!userInfo?.mid) {
      userInfo = await fetchCurrentUserInfo()
      preferenceStore.preference['user-info'] = userInfo
      preferenceStore.savePreference()
    }

    progress.running = true
    progress.phase = 'list'
    progress.percent = 0
    try {
      const data = await fetchAllFavorites(userInfo.mid, p => {
        progress.running = p.running
        progress.phase = p.phase
        progress.percent = p.percent
        progress.currentFolderIndex = p.currentFolderIndex
        progress.totalFolders = p.totalFolders
        progress.currentFolderTitle = p.currentFolderTitle
        progress.currentVideoPage = p.currentVideoPage
      })
      preferenceStore.preference['favorites-data'] = data
      preferenceStore.savePreference()
      return data
    } finally {
      Object.assign(progress, idleProgress())
    }
  }

  return { progress, running, refreshAllFavorites }
})
