import { getCookie } from '@renderer/api'
import { checkAuthStatus } from '@renderer/api/network'
import logger from 'electron-log/renderer'
import { defineStore } from 'pinia'

interface AuthState {
  isAuthenticated: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => {
    return {
      isAuthenticated: false
    }
  },
  actions: {
    async refreshAuth() {
      const biliJct = await getCookie('bili_jct')
      if (!biliJct) {
        logger.error('bili_jct cookie not found')
        return
      }
      const res = await checkAuthStatus({
        searchParams: {
          csrf: biliJct.value
        }
      })
      const { refresh } = res.data
      // refresh 为 true 时，需要刷新 cookie
      if (refresh) {
        this.isAuthenticated = false
        logger.debug('需要刷新Cookie')
      } else {
        this.isAuthenticated = true
        logger.debug('用户已登录,使用当前Cookie')
      }
    }
  }
})
