import { emitter, ipc, mittbus } from '@renderer/ipc'
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
      await emitter.invoke('check-for-update')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      mittbus.emit('toast:add', {
        severity: 'error',
        message
      })
      logger.error('检查更新失败:', message)
    }
  }

  const startDownload = async () => {
    downloading.value = true
    try {
      await emitter.invoke('download-update')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      mittbus.emit('toast:add', {
        severity: 'error',
        message
      })
      logger.error('下载更新失败:', message)
      downloading.value = false
    }
  }

  const quitAndInstall = async () => {
    try {
      await emitter.invoke('quit-and-install')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      mittbus.emit('toast:add', {
        severity: 'error',
        message
      })
      logger.error('重启安装失败:', message)
    }
  }

  const init = () => {
    registerSubscribe(
      ipc.on('update:available', (_, info) => {
        logger.info('Update available:', info)
        updateAvailable.value = true
        updateVersion.value = info.version
      })
    )

    registerSubscribe(
      ipc.on('update:manual-download', (_, info) => {
        logger.info('Update manual download:', info.version)
        updateAvailable.value = false
        mittbus.emit('toast:add', {
          severity: 'success',
          message: `发现新版本 v${info.version}`,
          data: {
            description: '已为你打开 GitHub 下载页面，请手动下载对应平台的安装包'
          }
        })
      })
    )

    registerSubscribe(
      ipc.on('update:not-available', () => {
        logger.info('Update not available')
        updateAvailable.value = false
      })
    )

    registerSubscribe(
      ipc.on('update:progress', (_, progress) => {
        downloadProgress.value = Math.round(progress.percent)
      })
    )

    registerSubscribe(
      ipc.on('update:downloaded', () => {
        logger.info('Update downloaded')
        downloading.value = false
        updateDownloaded.value = true
      })
    )

    registerSubscribe(
      ipc.on('update:error', (_, err) => {
        logger.error('Update error:', err)
        downloading.value = false
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
