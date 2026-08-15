import {
  clearDownloadHistories,
  subscribeDownloadItemEndEvent,
  subscribeDownloadItemProgressEvent,
  subscribeDownloadItemStartEvent
} from '@renderer/api'
import { fetchVideoPages } from '@renderer/services/video'
import { downloadTaskId } from '@shared/download'
import type { BiliVideoPage, DownloadProgressStatus } from '@shared/types'
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
 * 所有 DownloadStatus 通过 bvid+cid 读取共享状态
 */
export const useDownloadStore = defineStore('download', () => {
  const items = reactive<Record<string, DownloadItemState>>({})
  const pagesByBvid = reactive<Record<string, BiliVideoPage[]>>({})
  const pagesLoading = reactive<Record<string, boolean>>({})
  const pagesInflight = new Map<string, Promise<BiliVideoPage[]>>()

  function getItem(bvid: string, cid: number): DownloadItemState {
    const key = downloadTaskId(bvid, cid)
    let item = items[key]
    if (!item) {
      item = {
        status: 'idle',
        progress: 0,
        message: '',
        outputPath: ''
      }
      items[key] = item
    }
    return item
  }

  if (!ipcListenersRegistered) {
    ipcListenersRegistered = true

    subscribeDownloadItemStartEvent(({ bvid, cid }) => {
      const item = getItem(bvid, cid)
      const previous = item.status
      item.status = 'downloading'
      if (previous !== 'paused' && previous !== 'fail') {
        item.progress = 0
      }
      item.message = ''
    })

    subscribeDownloadItemProgressEvent(({ bvid, cid, type, progress }) => {
      const item = getItem(bvid, cid)
      item.status = type
      item.progress = progress
    })

    subscribeDownloadItemEndEvent(({ bvid, cid, success, message, outputPath }) => {
      const item = getItem(bvid, cid)
      item.status = success ? 'success' : 'fail'
      if (success) {
        item.progress = 100
      }
      item.message = message
      item.outputPath = outputPath || ''
    })
  }

  async function loadPages(bvid: string): Promise<BiliVideoPage[]> {
    const cached = pagesByBvid[bvid]
    if (cached?.length) return cached
    const pending = pagesInflight.get(bvid)
    if (pending) return pending

    pagesLoading[bvid] = true
    const request = fetchVideoPages(bvid)
      .then(pages => {
        pagesByBvid[bvid] = pages
        return pages
      })
      .finally(() => {
        pagesInflight.delete(bvid)
        pagesLoading[bvid] = false
      })
    pagesInflight.set(bvid, request)
    return request
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

  return { getItem, loadPages, pagesByBvid, pagesLoading, clearHistory }
})
