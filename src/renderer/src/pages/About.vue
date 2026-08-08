<script setup lang="ts">
import {
  BadgeCheck as BadgeCheckIcon,
  Bug as BugIcon,
  Info as InfoIcon,
  Loader2 as Loader2Icon,
  RefreshCw as RefreshCwIcon
} from '@lucide/vue'
import { checkForUpdate, getAppVersion } from '@renderer/api'
import { mittbus } from '@renderer/ipc'
import logger from 'electron-log/renderer'
import { computed, onUnmounted, ref } from 'vue'

const appVersion = ref('')
const isChecking = ref(false)

const fetchAppVersion = () => {
  getAppVersion()
    .then(version => (appVersion.value = version))
    .catch(e => logger.error(e))
}

const handleCheckUpdate = async () => {
  if (isChecking.value) return

  // 开发模式下 electron-updater 会直接跳过检查，主动提示用户
  if (import.meta.env.DEV) {
    mittbus.emit('toast:add', {
      severity: 'warn',
      message: '开发模式暂不支持检查更新',
      data: {
        description: 'electron-updater 在未打包环境下会跳过检查，请使用打包后的应用测试'
      }
    })
    return
  }

  isChecking.value = true
  try {
    const result = await checkForUpdate()
    if (result?.updateInfo) {
      mittbus.emit('toast:add', {
        severity: 'success',
        message: `发现新版本 v${result.updateInfo.version}`,
        data: {
          description: '新版本已就绪，可以下载更新'
        }
      })
      logger.info('Update available:', result.updateInfo)
    } else {
      mittbus.emit('toast:add', {
        severity: 'info',
        message: '当前已是最新版本'
      })
      logger.info('No update available')
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    mittbus.emit('toast:add', {
      severity: 'error',
      message: '检查更新失败',
      data: {
        description: message
      }
    })
    logger.error('Check update failed:', error)
  } finally {
    isChecking.value = false
  }
}

fetchAppVersion()

const versionList = computed(() => [
  {
    label: `v${appVersion.value}`,
    value: isChecking.value ? '检查中...' : '检查更新',
    icon: isChecking.value ? Loader2Icon : RefreshCwIcon,
    spin: isChecking.value,
    color: 'text-blue-400',
    action: handleCheckUpdate
  },
  {
    label: 'About',
    value: '关于我们',
    icon: InfoIcon,
    color: 'text-sky-400',
    link: 'https://github.com/W-David/bilimux' // Assuming a link or keep empty if not known
  },
  {
    label: 'License',
    value: '开源许可',
    icon: BadgeCheckIcon,
    color: 'text-emerald-400',
    link: 'https://github.com/W-David/bilimux/blob/main/LICENSE'
  },
  {
    label: 'Bug Report',
    value: '问题反馈',
    icon: BugIcon,
    color: 'text-rose-400',
    link: 'https://github.com/W-David/bilimux/issues'
  }
])

logger.debug('About created')
onUnmounted(() => {
  logger.debug('About unmounted')
})
</script>

<template>
  <div class="h-full flex select-none items-center justify-center overflow-hidden">
    <div class="relative z-10 w-120">
      <!-- Header -->
      <div class="flex flex-col items-center gap-6 pb-8 pt-10">
        <div class="group relative cursor-default">
          <!-- Glow effects -->
          <div
            class="absolute rounded-full from-blue-500/20 to-purple-500/20 bg-linear-to-r opacity-0 blur-3xl transition-opacity duration-700 -inset-8 group-hover:opacity-100"></div>
          <div
            class="absolute rounded-full from-blue-500/10 to-purple-500/10 bg-linear-to-r opacity-100 blur-2xl -inset-4"></div>

          <img
            src="../assets/bilimux.svg"
            alt="Logo"
            class="relative h-28 w-28 transform drop-shadow-2xl transition-transform duration-500 will-change-transform group-hover:rotate-3 group-hover:scale-110" />
        </div>

        <div class="relative text-center space-y-2">
          <h1
            class="from-pink-400 to-sky-400 bg-linear-to-r bg-clip-text text-4xl text-transparent font-black tracking-tight drop-shadow-sm">
            BiliMux
          </h1>
          <p class="text-sm text-gray-400 font-medium tracking-wide opacity-90">B站缓存视频转换工具</p>
        </div>
      </div>

      <!-- Cards Grid -->
      <div class="grid grid-cols-2 gap-4 px-6">
        <component
          :is="item.link ? 'a' : 'div'"
          v-for="item in versionList"
          :key="item.label"
          :href="item.link"
          :target="item.link ? '_blank' : undefined"
          class="relative flex cursor-pointer items-center gap-4 overflow-hidden border border-white/10 rounded-2xl bg-white/5 p-4 no-underline transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:shadow-xl hover:-translate-y-0.5"
          @click="item.action && item.action()">
          <!-- Icon -->
          <div
            class="flex shrink-0 items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <component
              :is="item.icon"
              class="size-8"
              :class="[item.color, { 'animate-spin': item.spin }]" />
          </div>

          <!-- Content -->
          <div class="min-w-0 flex flex-col gap-1">
            <span
              class="text-xs text-gray-500 font-bold tracking-wider uppercase transition-colors group-hover:text-gray-400">
              {{ item.label }}
            </span>
            <span class="truncate text-sm text-gray-200 font-medium transition-colors group-hover:text-white">
              {{ item.value }}
            </span>
          </div>
        </component>
      </div>

      <!-- Footer -->
      <div class="mt-12 flex flex-col items-center gap-2">
        <div class="flex items-center gap-1.5 text-xs text-gray-500 font-medium transition-colors hover:text-gray-400">
          <span>Designed & Developed by</span>
          <span class="from-blue-400 to-purple-400 bg-linear-to-r bg-clip-text text-transparent font-bold">
            rushwang
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
