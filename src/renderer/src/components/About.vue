<script setup lang="ts">
import { checkForUpdate, getAppVersion } from '@renderer/api'
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
  isChecking.value = true
  try {
    const result = await checkForUpdate()
    if (result && result.updateInfo) {
      logger.info('Update available:', result.updateInfo)
      // Here you might want to show a dialog or notification
      // For now, we just log it as per request "add function"
    } else {
      logger.info('No update available')
    }
  } catch (error) {
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
    icon: isChecking.value ? 'i-mdi-loading animate-spin' : 'i-mdi-update',
    color: 'text-blue-400',
    action: handleCheckUpdate
  },
  {
    label: 'About',
    value: '关于我们',
    icon: 'i-mdi-about',
    color: 'text-sky-400',
    link: 'https://github.com/W-David/bilimux' // Assuming a link or keep empty if not known
  },
  {
    label: 'License',
    value: '开源许可',
    icon: 'i-mdi-license',
    color: 'text-emerald-400',
    link: 'https://github.com/W-David/bilimux/blob/main/LICENSE'
  },
  {
    label: 'Bug Report',
    value: '问题反馈',
    icon: 'i-mdi-bug',
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
    <div class="relative z-10 w-[480px]">
      <!-- Header -->
      <div class="flex flex-col items-center gap-6 pb-8 pt-10">
        <div class="group relative cursor-default">
          <!-- Glow effects -->
          <div
            class="absolute rounded-full from-blue-500/20 to-purple-500/20 bg-gradient-to-r opacity-0 blur-3xl transition-opacity duration-700 -inset-8 group-hover:opacity-100"></div>
          <div
            class="absolute rounded-full from-blue-500/10 to-purple-500/10 bg-gradient-to-r opacity-100 blur-2xl -inset-4"></div>

          <img
            src="../assets/bilimux.svg"
            alt="Logo"
            class="relative h-28 w-28 transform drop-shadow-2xl transition-transform duration-500 will-change-transform group-hover:rotate-3 group-hover:scale-110" />
        </div>

        <div class="relative text-center space-y-2">
          <h1
            class="from-pink to-sky bg-gradient-to-r bg-clip-text text-4xl text-transparent font-black tracking-tight drop-shadow-sm">
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
            <div :class="[item.icon, item.color, 'text-3xl']"></div>
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
          <span class="from-blue-400 to-purple-400 bg-gradient-to-r bg-clip-text text-transparent font-bold">
            rushwang
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
