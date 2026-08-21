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

        <!-- Expired / Error State -->
        <div
          v-else-if="status === 'expired' || status === 'error'"
          class="absolute inset-0 z-20 flex flex-col cursor-pointer items-center justify-center rounded-xl bg-black/80 text-white backdrop-blur-sm transition-all hover:bg-black/90"
          @click="qrLogin.initQRCode()">
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
          @click="qrLogin.initQRCode()">
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
        v-else-if="status === 'error'"
        class="text-red-400">
        获取二维码失败，点击重试
      </div>
      <div
        v-else-if="status === 'success'"
        class="text-green-400 font-bold">
        登录成功
      </div>
      <div
        v-else
        class="w-50 overflow-hidden text-center text-wrap text-xs text-gray-400 font-normal leading-relaxed italic">
        <div>登录后可查看收藏、追番和追剧</div>
        <div>本机缓存不需要登录</div>
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
import { useAuthStore } from '@renderer/store/auth'
import { useQrLoginStore } from '@renderer/store/qrLogin'
import { storeToRefs } from 'pinia'
import { onActivated, onMounted } from 'vue'

const props = withDefaults(
  defineProps<{
    autoStart?: boolean
  }>(),
  {
    autoStart: false
  }
)

const authStore = useAuthStore()
const qrLogin = useQrLoginStore()
const { status, qrCodeUrl, countdown } = storeToRefs(qrLogin)

const attach = (): void => {
  if (!props.autoStart) return
  if (authStore.isAuthenticated) return
  qrLogin.ensureQr()
}

onMounted(attach)
onActivated(attach)
</script>
