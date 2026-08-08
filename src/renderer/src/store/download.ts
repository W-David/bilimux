import {
  clearDownloadHistories,
  subscribeDownloadItemEndEvent,
  subscribeDownloadItemProgressEvent,
  subscribeDownloadItemStartEvent
} from '@renderer/api'
import type { DownloadProgressStatus } from '@shared/types'
import { defineStore } from 'pinia'
import { reactive } from 'vue'

export type DownloadItemStatus = DownloadProgressStatus | 'idle'

export type DownloadItemState = {
  status: DownloadItemStatus
  progress: number
  message: string
  outputPath: string
}

let ipcListenersRegistered = false

/**
 * 下载状态全局 store：IPC 下载事件只注册一份监听，
 * 所有 DownloadStatus 组件通过 bvid 读取共享状态，避免每个组件各挂一个监听器
 */
export const useDownloadStore = defineStore('download', () => {
  const items = reactive<Record<string, DownloadItemState>>({})

  function getItem(bvid: string): DownloadItemState {
    let item = items[bvid]
    if (!item) {
      item = {
        status: 'idle',
        progress: 0,
        message: '',
        outputPath: ''
      }
      items[bvid] = item
    }
    return item
  }

  // 全局只注册一次 IPC 监听
  if (!ipcListenersRegistered) {
    ipcListenersRegistered = true

    subscribeDownloadItemStartEvent(({ bvid }) => {
      const item = getItem(bvid)
      const previous = item.status
      item.status = 'downloading'
      if (previous !== 'paused' && previous !== 'fail') {
        item.progress = 0
      }
      item.message = ''
    })

    subscribeDownloadItemProgressEvent(({ bvid, type, progress }) => {
      const item = getItem(bvid)
      item.status = type
      item.progress = progress
    })

    subscribeDownloadItemEndEvent(({ bvid, success, message, outputPath }) => {
      const item = getItem(bvid)
      item.status = success ? 'success' : 'fail'
      if (success) {
        item.progress = 100
      }
      item.message = message
      item.outputPath = outputPath || ''
    })
  }

  /** 清空下载历史：删除数据库记录并重置内存中的下载状态 */
  const clearHistory = async (): Promise<void> => {
    await clearDownloadHistories()
    for (const key of Object.keys(items)) {
      const item = items[key]
      item.status = 'idle'
      item.progress = 0
      item.message = ''
      item.outputPath = ''
    }
  }

  return { getItem, clearHistory }
})
