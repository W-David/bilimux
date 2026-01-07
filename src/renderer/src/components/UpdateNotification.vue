<script setup lang="ts">
import {
  checkForUpdate,
  downloadUpdate as downloadUpdateApi,
  quitAndInstall as quitAndInstallApi,
  subscribeUpdateAvailable,
  subscribeUpdateDownloaded,
  subscribeUpdateError,
  subscribeUpdateNotAvailable,
  subscribeUpdateProgress
} from '@renderer/api'
import logger from 'electron-log/renderer'
import { computed, onMounted, onUnmounted, ref } from 'vue'

const updateAvailable = ref(true)
const updateDownloaded = ref(false)
const downloading = ref(false)
const downloadProgress = ref(0)
const updateVersion = ref('')

const unsubscribes: (() => void)[] = []

const registerSubscribe = (fn: () => void): void => {
  unsubscribes.push(fn)
}

const unregisterSubscribes = (): void => {
  unsubscribes.forEach(fn => fn && fn())
  unsubscribes.length = 0
}

const checkUpdates = async () => {
  try {
    await checkForUpdate()
  } catch (error) {
    logger.error('Failed to check for updates:', error)
  }
}

const startDownload = async () => {
  downloading.value = true
  try {
    await downloadUpdateApi()
  } catch (error) {
    logger.error('Failed to download update:', error)
    downloading.value = false
  }
}

const quitAndInstall = async () => {
  try {
    await quitAndInstallApi()
  } catch (error) {
    logger.error('Failed to quit and install:', error)
  }
}

// Theme classes based on state
const containerClasses = computed(() => {
  if (updateDownloaded.value) {
    return 'bg-green-500/10 dark:bg-green-500/20 border-green-200 dark:border-green-500/30'
  }
  return 'bg-pink-500/10 dark:bg-pink-500/20 border-pink-200 dark:border-pink-500/30'
})

const textPrimaryClasses = computed(() => {
  if (updateDownloaded.value) {
    return 'text-green-600 dark:text-green-400'
  }
  return 'text-pink-600 dark:text-pink-400'
})

onMounted(() => {
  registerSubscribe(
    subscribeUpdateAvailable(info => {
      logger.info('Update available:', info)
      updateAvailable.value = true
      updateVersion.value = info.version
    })
  )

  registerSubscribe(
    subscribeUpdateNotAvailable(() => {
      logger.info('Update not available')
      updateAvailable.value = false
    })
  )

  registerSubscribe(
    subscribeUpdateProgress(progress => {
      downloadProgress.value = Math.round(progress.percent)
    })
  )

  registerSubscribe(
    subscribeUpdateDownloaded(() => {
      logger.info('Update downloaded')
      downloading.value = false
      updateDownloaded.value = true
    })
  )

  registerSubscribe(
    subscribeUpdateError(err => {
      logger.error('Update error:', err)
      downloading.value = false
      updateAvailable.value = false
    })
  )

  // Check for updates on mount
  checkUpdates()
})

onUnmounted(() => {
  unregisterSubscribes()
})
</script>

<template>
  <div
    v-if="updateAvailable"
    class="fixed right-4 top-4 z-50">
    <div
      class="flex items-center gap-3 border rounded-full px-4 py-2 shadow-lg backdrop-blur transition-all duration-300 hover:shadow-xl"
      :class="containerClasses">
      <span
        class="text-xs font-semibold"
        :class="textPrimaryClasses">
        {{ updateDownloaded ? '更新已就绪' : '发现新版本' }}
      </span>

      <div v-if="!updateDownloaded && !downloading">
        <div
          class="cursor-pointer rounded-full bg-pink-400 px-2 py-1 text-xs text-light transition-colors hover:ring-pink"
          @click="startDownload">
          更新
        </div>
      </div>

      <div
        v-else-if="downloading"
        class="flex items-center gap-2">
        <div class="h-1.5 w-16 overflow-hidden rounded-full bg-pink-200 dark:bg-pink-900/50">
          <div
            class="bg-primary-500 h-full transition-all duration-300 ease-out"
            :style="{ width: `${downloadProgress}%` }"></div>
        </div>
        <span class="w-6 text-right text-[10px] text-pink-400 dark:text-pink-300">{{ downloadProgress }}%</span>
      </div>

      <div v-else-if="updateDownloaded">
        <div
          class="cursor-pointer rounded-full bg-green-500 px-3 py-1 text-xs text-white transition-colors hover:bg-green-600"
          @click="quitAndInstall">
          重启安装
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Add any specific animations or transitions if needed */
</style>
