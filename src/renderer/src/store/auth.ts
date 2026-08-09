import { getCookie, logout as logoutApi } from '@renderer/api'
import { checkAuthStatus } from '@renderer/api/network'
import { mittbus } from '@renderer/ipc'
import { usePreferenceStore } from '@renderer/store/preference'
import logger from 'electron-log/renderer'
import { defineStore } from 'pinia'

interface AuthState {
  isAuthenticated: boolean
  /** 登录态是否已完成首次检查（用于路由守卫等待启动竞态） */
  initialized: boolean
}

let authReadyPromise: Promise<void> | null = null

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => {
    return {
      isAuthenticated: false,
      initialized: false
    }
  },
  actions: {
    async refreshAuth() {
      const biliJct = await getCookie('bili_jct')
      if (!biliJct) {
        logger.error('bili_jct cookie not found')
        this.clearCachedUserData()
        mittbus.emit('toast:add', {
          severity: 'warn',
          message: '登录状态已失效，请重新扫码登录'
        })
        return
      }
      const res = await checkAuthStatus({
        searchParams: {
          csrf: biliJct.value
        }
      })
      if (res.code !== 0 || !res.data) {
        this.clearCachedUserData()
        mittbus.emit('toast:add', {
          severity: 'warn',
          message: '登录状态已失效，请重新扫码登录'
        })
        return
      }
      const { refresh } = res.data
      // refresh 为 true 时，需要刷新 cookie
      if (refresh) {
        this.isAuthenticated = false
        this.clearCachedUserData()
        mittbus.emit('toast:add', {
          severity: 'warn',
          message: '登录状态已过期，请重新扫码登录'
        })
        logger.debug('需要刷新Cookie')
      } else {
        this.isAuthenticated = true
        logger.debug('用户已登录,使用当前Cookie')
      }
    },
    /**
     * 确保登录态完成首次检查；并发调用共享同一次检查
     */
    ensureReady(): Promise<void> {
      if (this.initialized) return Promise.resolve()
      if (!authReadyPromise) {
        authReadyPromise = this.refreshAuth()
          .catch(error => {
            logger.error('登录状态检查失败:', error)
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
      preferenceStore.preference['favorites-data'] = null
      preferenceStore.savePreference()
      logger.debug('已清理本地缓存的用户信息与收藏夹数据')
    },
    async logout() {
      try {
        await logoutApi()
      } catch (error) {
        logger.error('清除主进程登录信息失败:', error)
      } finally {
        this.isAuthenticated = false
        // 同步清空渲染进程内存里缓存的登录信息并持久化
        const preferenceStore = usePreferenceStore()
        preferenceStore.preference['user-info'] = null
        preferenceStore.preference['favorites-data'] = null
        preferenceStore.savePreference()
        logger.debug('已退出登录，本地登录态已清空')
      }
    }
  }
})
