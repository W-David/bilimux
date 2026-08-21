import { checkQrCodeLoginStatus, getQrCode } from '@renderer/api/network'
import { emitter, mittbus } from '@renderer/ipc'
import { fetchCurrentUserInfo } from '@renderer/services/user'
import { useAuthStore } from '@renderer/store/auth'
import { useLibraryStore } from '@renderer/store/library'
import { usePreferenceStore } from '@renderer/store/preference'
import logger from 'electron-log/renderer'
import QRCode from 'qrcode'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type QrLoginStatus = 'initial' | 'loading' | 'loaded' | 'scanned' | 'expired' | 'error' | 'success'

const QR_TTL_MS = 180_000

enum QRCodeStatus {
  SUCCESS = 0,
  SCANNED = 86090,
  EXPIRED = 86038,
  WAITING = 86101
}

export const useQrLoginStore = defineStore('qrLogin', () => {
  const status = ref<QrLoginStatus>('initial')
  const qrCodeUrl = ref('')
  const qrCodeKey = ref('')
  const countdown = ref(180)
  const endTime = ref(0)

  let pollTimer: ReturnType<typeof setInterval> | null = null
  let tickTimer: ReturnType<typeof setInterval> | null = null
  let initSeq = 0

  const isUsable = (): boolean => {
    if (status.value !== 'loaded' && status.value !== 'scanned') return false
    return Date.now() < endTime.value
  }

  const stopPolling = (): void => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  const stopTick = (): void => {
    if (tickTimer) {
      clearInterval(tickTimer)
      tickTimer = null
    }
  }

  const resetSession = (): void => {
    initSeq += 1
    stopPolling()
    stopTick()
    status.value = 'initial'
    qrCodeUrl.value = ''
    qrCodeKey.value = ''
    countdown.value = 180
    endTime.value = 0
  }

  const handleExpired = (): void => {
    if (status.value === 'expired' || status.value === 'success') return
    status.value = 'expired'
    stopPolling()
    stopTick()
    countdown.value = 0
  }

  const updateCountdown = (): void => {
    if (!endTime.value) return
    const remaining = Math.ceil((endTime.value - Date.now()) / 1000)
    if (remaining <= 0) {
      countdown.value = 0
      handleExpired()
      return
    }
    countdown.value = remaining
  }

  const startTick = (): void => {
    stopTick()
    updateCountdown()
    if (status.value !== 'loaded' && status.value !== 'scanned') return
    tickTimer = setInterval(updateCountdown, 250)
  }

  const startPolling = (): void => {
    if (pollTimer) return
    pollTimer = setInterval(() => {
      void pollOnce()
    }, 2000)
  }

  const persistUserInfoOnLogin = async (): Promise<void> => {
    try {
      const userInfo = await fetchCurrentUserInfo()
      const preferenceStore = usePreferenceStore()
      preferenceStore.preference['user-info'] = userInfo
      preferenceStore.savePreference()
      useLibraryStore().reset()
    } catch (error) {
      logger.error('登录后获取用户信息失败:', error)
    }
  }

  const pollOnce = async (): Promise<void> => {
    const key = qrCodeKey.value
    if (!key) return
    try {
      const res = await checkQrCodeLoginStatus({
        searchParams: { qrcode_key: key }
      })
      if (qrCodeKey.value !== key) return
      if (!res.data) return

      const { code } = res.data
      switch (code) {
        case QRCodeStatus.SUCCESS: {
          status.value = 'success'
          stopPolling()
          stopTick()
          try {
            await emitter.invoke('persist-cookie')
          } catch (error) {
            logger.error('持久化登录 Cookie 失败:', error)
          }
          await persistUserInfoOnLogin()
          const authStore = useAuthStore()
          authStore.isAuthenticated = true
          authStore.closeLogin()
          resetSession()
          break
        }
        case QRCodeStatus.SCANNED:
          status.value = 'scanned'
          break
        case QRCodeStatus.EXPIRED:
          handleExpired()
          break
        case QRCodeStatus.WAITING:
          break
        default:
          logger.warn('未知的扫码状态:', res.data)
      }
    } catch (error) {
      logger.error('检查扫码状态失败:', error)
    }
  }

  const emitQrError = (message: string): void => {
    status.value = 'error'
    stopPolling()
    stopTick()
    if (!useAuthStore().loginOpen) return
    mittbus.emit('toast:add', {
      severity: 'error',
      message
    })
  }

  const initQRCode = async (): Promise<void> => {
    const seq = ++initSeq
    stopPolling()
    stopTick()
    status.value = 'loading'
    qrCodeUrl.value = ''
    qrCodeKey.value = ''
    countdown.value = 180
    endTime.value = 0

    try {
      const res = await getQrCode()
      if (seq !== initSeq) return

      if (res.code !== 0 || !res.data) {
        const message = `获取登录二维码失败(${res.code})`
        logger.error(message)
        emitQrError(message)
        return
      }

      const { url, qrcode_key } = res.data
      const dataUrl = await QRCode.toDataURL(url, {
        margin: 1,
        width: 200,
        color: {
          dark: '#ec4899',
          light: '#ffffff'
        }
      })
      if (seq !== initSeq) return

      qrCodeKey.value = qrcode_key
      qrCodeUrl.value = dataUrl
      endTime.value = Date.now() + QR_TTL_MS
      status.value = 'loaded'
      startTick()
      startPolling()
    } catch (error) {
      if (seq !== initSeq) return
      logger.error('Error init QR code:', error)
      emitQrError(error instanceof Error ? error.message : '获取登录二维码失败')
    }
  }

  const ensureQr = (): void => {
    if (useAuthStore().isAuthenticated) return
    if (status.value === 'loading') return
    if (isUsable()) {
      startTick()
      startPolling()
      return
    }
    if (endTime.value && Date.now() >= endTime.value && status.value !== 'expired' && status.value !== 'success') {
      handleExpired()
      return
    }
    if (status.value === 'expired' || status.value === 'error') return
    if (status.value === 'success') resetSession()
    void initQRCode()
  }

  return {
    status,
    qrCodeUrl,
    countdown,
    ensureQr,
    initQRCode,
    resetSession
  }
})
