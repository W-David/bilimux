import { emitter, mittbus } from '@renderer/ipc'
import { usePreferenceStore } from '@renderer/store/preference'
import logger from 'electron-log/renderer'
import { defineStore } from 'pinia'

interface AuthState {
  isAuthenticated: boolean
  /** 登录态是否已完成首次检查（用于路由守卫等待启动竞态） */
  initialized: boolean
  /** 扫码登录浮层 */
  loginOpen: boolean
  /** 用户信息卡片 */
  profileOpen: boolean
}

let authReadyPromise: Promise<void> | null = null

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => {
    return {
      isAuthenticated: false,
      initialized: false,
      loginOpen: false,
      profileOpen: false
    }
  },
  actions: {
    /**
     * 清掉登录态与本地用户缓存，并离开需要登录的页面。
     */
    async invalidateSession(message?: string) {
      this.isAuthenticated = false
      this.profileOpen = false
      this.clearCachedUserData()
      if (message) {
        mittbus.emit('toast:add', {
          severity: 'warn',
          message
        })
      }
    },
    openLogin() {
      this.loginOpen = true
    },
    closeLogin() {
      this.loginOpen = false
    },
    openProfile() {
      this.profileOpen = true
    },
    closeProfile() {
      this.profileOpen = false
    },
    async refreshAuth() {
      const result = await emitter.invoke('auth:ensure')
      if (!result.ok) {
        await this.invalidateSession(result.message || '登录状态已失效，请重新扫码登录')
        return
      }
      this.isAuthenticated = true
      logger.debug('用户已登录')
    },
    /**
     * 确保登录态完成首次检查；并发调用共享同一次检查
     */
    ensureReady(): Promise<void> {
      if (this.initialized) return Promise.resolve()
      if (!authReadyPromise) {
        authReadyPromise = this.refreshAuth()
          .catch(async error => {
            logger.error('登录状态检查失败:', error)
            await this.invalidateSession('登录状态检查失败，请重新扫码登录')
          })
          .finally(() => {
            this.initialized = true
            authReadyPromise = null
          })
      }
      return authReadyPromise
    },
    clearCachedUserData() {
      const preferenceStore = usePreferenceStore()
      preferenceStore.preference['user-info'] = null
      preferenceStore.savePreference()
      void import('@renderer/store/library').then(({ useLibraryStore }) => {
        useLibraryStore().reset()
      })
      logger.debug('已清理本地缓存的用户信息')
    },
    async logout() {
      try {
        await emitter.invoke('logout')
      } catch (error) {
        logger.error('清除主进程登录信息失败:', error)
      } finally {
        this.isAuthenticated = false
        this.clearCachedUserData()
        logger.debug('已退出登录，本地登录态已清空')
      }
    }
  }
})
