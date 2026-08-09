<template>
  <div class="h-full w-full flex flex-col items-center justify-center gap-2 rounded-md">
    <div class="relative h-44 w-44 flex items-center justify-center overflow-hidden rounded-xl bg-transparent">
      <Transition
        name="fade"
        mode="out-in"
        appear>
        <!-- Loading State -->
        <div
          v-if="status === 'loading'"
          class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-900/90 backdrop-blur-sm">
          <Loader2Icon class="size-8 animate-spin text-pink-500" />
        </div>

        <!-- Loaded QR Code Image -->
        <div
          v-else-if="status === 'loaded' && qrCodeUrl"
          class="h-full w-full rounded-xl bg-white p-2">
          <img
            :src="qrCodeUrl"
            class="h-full w-full object-contain"
            alt="Login QR Code" />
        </div>

        <!-- Scanned State -->
        <div
          v-else-if="status === 'scanned'"
          class="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl bg-zinc-900/90 p-4 text-center backdrop-blur-md">
          <SmartphoneIcon class="size-10 animate-pulse text-green-500" />
        </div>

        <!-- Expired State -->
        <div
          v-else-if="status === 'expired'"
          class="absolute inset-0 z-20 flex flex-col cursor-pointer items-center justify-center rounded-xl bg-black/80 text-white backdrop-blur-sm transition-all hover:bg-black/90"
          @click="initQRCode">
          <RefreshCwIcon class="size-8 text-gray-400 transition-transform duration-500 group-hover:rotate-180" />
        </div>

        <!-- Success State -->
        <div
          v-else-if="status === 'success'"
          class="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl bg-zinc-900/95">
          <CircleCheckIcon class="size-10 animate-bounce text-green-500" />
        </div>

        <!-- Initial State -->
        <div
          v-else
          class="group absolute inset-0 z-10 flex flex-col cursor-pointer items-center justify-center border-2 border-zinc-700 rounded-xl border-dashed bg-zinc-800/50 transition-colors duration-300 hover:border-pink-500/50 hover:bg-zinc-800"
          @click="initQRCode">
          <QrCodeIcon
            class="mb-3 size-10 text-gray-600 transition-colors duration-300 group-hover:scale-110 group-hover:text-pink-500" />
          <span class="text-xs text-gray-500 font-medium transition-colors group-hover:text-gray-300">获取二维码</span>
        </div>
      </Transition>
    </div>

    <!-- Status Text -->
    <div class="mt-4 w-full text-sm text-gray-200 flex items-center justify-center">
      <div v-if="status === 'loading'">正在加载二维码...</div>
      <div v-else-if="status === 'loaded'">
        <div class="mb-1">请使用 Bilibili 移动端扫码</div>
        <div class="text-xs text-gray-200 flex items-center justify-center">
          <div>即将于</div>
          <div class="w-10 text-center text-pink-500 font-mono">{{ countdown }}s</div>
          <div>后过期</div>
        </div>
      </div>
      <div
        v-else-if="status === 'scanned'"
        class="text-green-400">
        扫描成功，请在手机上确认
      </div>
      <div
        v-else-if="status === 'expired'"
        class="text-red-400">
        二维码已过期，请刷新
      </div>
      <div
        v-else-if="status === 'success'"
        class="text-green-400 font-bold">
        登录成功
      </div>
      <div
        v-else
        class="w-50 overflow-hidden text-center text-wrap text-xs text-gray-400 font-normal leading-relaxed italic">
        <div>为避免触发 B 站风控</div>
        <div>登录后会一次性获取所有收藏夹视频</div>
        <div>后续可手动刷新</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CircleCheck as CircleCheckIcon,
  Loader2 as Loader2Icon,
  QrCode as QrCodeIcon,
  RefreshCw as RefreshCwIcon,
  Smartphone as SmartphoneIcon
} from '@lucide/vue'
import { persistCookie } from '@renderer/api'
import { mittbus } from '@renderer/ipc'
import { fetchCurrentUserInfo } from '@renderer/services/user'
import { useAuthStore } from '@renderer/store/auth'
import { useFavoritesStore } from '@renderer/store/favorites'
import { usePreferenceStore } from '@renderer/store/preference'
import logger from 'electron-log/renderer'
import QRCode from 'qrcode'
import { onActivated, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { checkQrCodeLoginStatus, getQrCode } from '../api/network'

// 登录状态类型
type LoginStatus = 'initial' | 'loading' | 'loaded' | 'scanned' | 'expired' | 'success'

// 扫码状态
enum QRCodeStatus {
  SUCCESS = 0,
  SCANNED = 86090,
  EXPIRED = 86038,
  WAITING = 86101
}

// 状态定义
const status = ref<LoginStatus>('initial')
const authStore = useAuthStore()
const favoritesStore = useFavoritesStore()
const router = useRouter()
const qrCodeUrl = ref('')
const qrCodeKey = ref('')
const countdown = ref(180)

// 定时器状态管理
const timerState = {
  pollTimer: null as ReturnType<typeof setInterval> | null,
  rafId: null as number | null,
  endTime: 0
}

// 初始化二维码
const initQRCode = async () => {
  try {
    resetState()
    status.value = 'loading'

    // 获取二维码 Key 和 Url
    const res = await getQrCode()

    if (res.code === 0 && res.data) {
      const { url, qrcode_key } = res.data
      qrCodeKey.value = qrcode_key

      // 生成二维码图片
      qrCodeUrl.value = await QRCode.toDataURL(url, {
        margin: 1,
        width: 200,
        color: {
          dark: '#ec4899',
          light: '#ffffff'
        }
      })

      status.value = 'loaded'
      startCountdown()
      startPolling()
    } else {
      const message = `获取登录二维码失败(${res.code})`
      logger.error(message)
      mittbus.emit('toast:add', {
        severity: 'error',
        message
      })
    }
  } catch (error) {
    logger.error('Error init QR code:', error)
  }
}

// 重置状态
const resetState = () => {
  stopPolling()
  stopCountdown()
  status.value = 'initial'
  qrCodeUrl.value = ''
  qrCodeKey.value = ''
  countdown.value = 180
}

// 开始倒计时
const startCountdown = () => {
  stopCountdown()
  timerState.endTime = Date.now() + 180 * 1000 // 180秒后过期

  const tick = () => {
    const remaining = Math.ceil((timerState.endTime - Date.now()) / 1000)

    if (remaining <= 0) {
      countdown.value = 0
      handleExpired()
    } else {
      countdown.value = remaining
      timerState.rafId = requestAnimationFrame(tick)
    }
  }

  tick()
}

// 处理过期
const handleExpired = () => {
  status.value = 'expired'
  stopPolling()
  stopCountdown()
}

// 开始轮询
const startPolling = () => {
  stopPolling()
  timerState.pollTimer = setInterval(async () => {
    try {
      if (!qrCodeKey.value) {
        logger.warn('二维码 Key 为空，无法轮询检查状态')
        return
      }

      const res = await checkQrCodeLoginStatus({
        searchParams: {
          qrcode_key: qrCodeKey.value
        }
      })

      if (res.data) {
        const { code } = res.data

        switch (code) {
          case QRCodeStatus.SUCCESS: // 登录成功
            status.value = 'success'
            stopPolling()
            stopCountdown()
            logger.debug('扫码已确认')
            logger.info('扫码登录成功，开始持久化登录 Cookie')
            authStore.isAuthenticated = true
            try {
              // 登录成功后主动持久化 cookie jar，避免重启后登录态丢失
              await persistCookie()
              logger.info('登录 Cookie 已主动持久化')
            } catch (error) {
              logger.error('持久化登录 Cookie 失败:', error)
            }
            await persistUserInfoOnLogin()
            // 登录成功后只在这里触发一次收藏夹获取，下载页不再挂载即自动获取
            favoritesStore.refreshAllFavorites().catch(error => {
              logger.error('登录后获取收藏夹失败:', error)
            })
            router.push({ name: 'download-task' })
            break
          case QRCodeStatus.SCANNED: // 已扫码未确认
            logger.debug('扫码未确认')
            status.value = 'scanned'
            break
          case QRCodeStatus.EXPIRED: // 二维码已失效
            logger.debug('二维码已过期')
            handleExpired()
            break
          case QRCodeStatus.WAITING: // 未扫码 (waiting)
            logger.debug('interval waiting...')
            break
          default:
            logger.warn('未知的扫码状态:', res.data)
        }
      }
    } catch (error) {
      logger.error('检查扫码状态失败:', error)
    }
  }, 2000) // 每2秒轮询一次
}

/**
 * 扫码登录成功后单独获取并持久化用户信息
 */
const persistUserInfoOnLogin = async (): Promise<void> => {
  try {
    const userInfo = await fetchCurrentUserInfo()
    const preferenceStore = usePreferenceStore()
    preferenceStore.preference['user-info'] = userInfo
    // 新账号登录后清掉上一个账号的收藏夹缓存
    preferenceStore.preference['favorites-data'] = null
    preferenceStore.savePreference()
  } catch (error) {
    logger.error('登录后获取用户信息失败:', error)
  }
}

// 停止轮询
const stopPolling = () => {
  if (timerState.pollTimer) {
    clearInterval(timerState.pollTimer)
    timerState.pollTimer = null
  }
}

// 停止倒计时
const stopCountdown = () => {
  if (timerState.rafId) {
    cancelAnimationFrame(timerState.rafId)
    timerState.rafId = null
  }
}

logger.info('Qrcode created')

// KeepAlive 复用缓存实例时，若已退出登录则重置为初始画面
onActivated(() => {
  if (!authStore.isAuthenticated) {
    resetState()
  }
})

onUnmounted(() => {
  resetState()
  logger.info('Qrcode unmounted')
})
</script>
