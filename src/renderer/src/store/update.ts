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
import { mittbus } from '@renderer/ipc'
import logger from 'electron-log/renderer'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUpdateStore = defineStore('update', () => {
  const updateAvailable = ref(false)
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
      const message = error instanceof Error ? error.message : String(error)
      mittbus.emit('toast:add', {
        group: 'br',
        severity: 'error',
        summary: '错误',
        detail: message,
        life: 3000,
        closable: false
      })
      logger.error('检查更新失败:', message)
    }
  }

  const startDownload = async () => {
    downloading.value = true
    try {
      await downloadUpdateApi()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      mittbus.emit('toast:add', {
        group: 'br',
        severity: 'error',
        summary: '错误',
        detail: message,
        life: 3000,
        closable: false
      })
      logger.error('下载更新失败:', message)
      downloading.value = false
    }
  }

  const quitAndInstall = async () => {
    try {
      await quitAndInstallApi()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      mittbus.emit('toast:add', {
        group: 'br',
        severity: 'error',
        summary: '错误',
        detail: message,
        life: 3000,
        closable: false
      })
      logger.error('重启安装失败:', message)
    }
  }

  const init = () => {
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

    checkUpdates()
  }

  // Cleanup on unmount is tricky in a store, usually init/destroy are called by component
  // or it's a singleton. Assuming component will call init, we should probably handle cleanup there or here if this store is meant to be global and persistent.
  // Given the previous component code used onUnmounted, let's expose a destroy method.
  const destroy = () => {
    unregisterSubscribes()
  }

  return {
    updateAvailable,
    updateDownloaded,
    downloading,
    downloadProgress,
    updateVersion,
    checkUpdates,
    startDownload,
    quitAndInstall,
    init,
    destroy
  }
})
