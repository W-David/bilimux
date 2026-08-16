import {
  clearDownloadHistories,
  subscribeDownloadItemEndEvent,
  subscribeDownloadItemProgressEvent,
  subscribeDownloadItemStartEvent
} from '@renderer/api'
import { fetchVideoPages } from '@renderer/services/video'
import { downloadTaskId } from '@shared/download'
import type { BiliVideoPage, DownloadProgressStatus, FavoriteResource } from '@shared/types'
import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'

export type DownloadSelectionEntry = {
  video: FavoriteResource
  folderName: string
  folderId: number
  /** null 表示整稿全部分 P；否则为已点选的 cid */
  cids: number[] | null
}

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
  const selections = reactive<Record<string, DownloadSelectionEntry>>({})
  const expandedBvid = ref<string | null>(null)
  const multiSelectMode = ref(false)

  const selectedList = computed(() => Object.values(selections))
  const selectedCount = computed(() => selectedList.value.length)

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

  function getSelection(bvid: string): DownloadSelectionEntry | undefined {
    return selections[bvid]
  }

  function isSelected(bvid: string): boolean {
    return Boolean(selections[bvid])
  }

  function isPartiallySelected(bvid: string): boolean {
    const entry = selections[bvid]
    return Boolean(entry?.cids)
  }

  function isCidSelected(bvid: string, cid: number): boolean {
    const entry = selections[bvid]
    if (!entry) return false
    if (entry.cids == null) return true
    return entry.cids.includes(cid)
  }

  function areAllPartsSelected(bvid: string, allCids: number[]): boolean {
    const entry = selections[bvid]
    if (!entry) return false
    if (entry.cids == null) return true
    return allCids.length > 0 && allCids.every(cid => entry.cids!.includes(cid))
  }

  function setExpanded(bvid: string | null): void {
    expandedBvid.value = bvid
  }

  function setMultiSelectMode(on: boolean): void {
    multiSelectMode.value = on
    if (!on) {
      clearSelections()
      setExpanded(null)
    }
  }

  function toggleMultiSelectMode(): void {
    setMultiSelectMode(!multiSelectMode.value)
  }

  function selectVideo(
    video: FavoriteResource,
    folderName: string,
    folderId: number,
    cids: number[] | null = null
  ): void {
    selections[video.bvid] = { video, folderName, folderId, cids }
  }

  function deselectVideo(bvid: string): void {
    delete selections[bvid]
  }

  function toggleVideo(video: FavoriteResource, folderName: string, folderId: number): void {
    const existing = selections[video.bvid]
    if (!existing) {
      selectVideo(video, folderName, folderId, null)
      return
    }
    if (existing.cids) {
      existing.cids = null
      existing.folderName = folderName
      existing.folderId = folderId
      return
    }
    deselectVideo(video.bvid)
  }

  function selectVideos(videos: FavoriteResource[], folderName: string, folderId: number): void {
    for (const video of videos) {
      selectVideo(video, folderName, folderId, null)
    }
  }

  function deselectVideos(bvids: Iterable<string>): void {
    for (const bvid of bvids) deselectVideo(bvid)
  }

  function toggleCid(
    video: FavoriteResource,
    folderName: string,
    folderId: number,
    cid: number,
    allCids: number[]
  ): void {
    const existing = selections[video.bvid]
    if (!existing) {
      selectVideo(video, folderName, folderId, [cid])
      return
    }

    const current = existing.cids == null ? allCids : existing.cids
    const nextSet = new Set(current)
    if (nextSet.has(cid)) nextSet.delete(cid)
    else nextSet.add(cid)

    if (nextSet.size === 0) {
      deselectVideo(video.bvid)
      return
    }

    const next = allCids.filter(id => nextSet.has(id))
    existing.cids = next.length === allCids.length ? null : next
    existing.folderName = folderName
    existing.folderId = folderId
  }

  function clearSelections(): void {
    for (const key of Object.keys(selections)) delete selections[key]
  }

  return {
    getItem,
    loadPages,
    pagesByBvid,
    pagesLoading,
    clearHistory,
    selections,
    selectedList,
    selectedCount,
    expandedBvid,
    multiSelectMode,
    getSelection,
    isSelected,
    isPartiallySelected,
    isCidSelected,
    areAllPartsSelected,
    setExpanded,
    setMultiSelectMode,
    toggleMultiSelectMode,
    selectVideo,
    deselectVideo,
    toggleVideo,
    selectVideos,
    deselectVideos,
    toggleCid,
    clearSelections
  }
})
