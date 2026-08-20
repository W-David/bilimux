import {
  clearDownloadHistories,
  getDownloadHistories,
  getDownloadHistory,
  removeDownloadHistory,
  startDownloadVideo,
  subscribeDownloadItemEndEvent,
  subscribeDownloadItemProgressEvent,
  subscribeDownloadItemStartEvent
} from '@renderer/api'
import { mittbus } from '@renderer/ipc'
import { fetchVideoPages } from '@renderer/services/video'
import { downloadTaskId } from '@shared/download'
import type { BiliVideoPage, DownloadHistoryRecord, DownloadProgressStatus, FavoriteResource } from '@shared/types'
import logger from 'electron-log/renderer'
import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'

type DownloadItemStatus = DownloadProgressStatus | 'idle'

type DownloadItemState = {
  status: DownloadItemStatus
  progress: number
  message: string
  outputPath: string
}

type DownloadPartLane = 'waiting' | 'active' | 'completed'

export type DownloadTaskRow = {
  video: FavoriteResource
  folderName: string
  page: BiliVideoPage
  pagesTotal: number
  history: DownloadHistoryRecord | null
  kind?: 'ugc' | 'ogv'
  epId?: number
}

type VideoBadge = {
  status: 'idle' | 'active' | 'partial' | 'completed'
  label: string
}

const ACTIVE_STATUS = new Set<DownloadItemStatus>([
  'waiting',
  'downloading',
  'paused',
  'preprocess',
  'importing',
  'writing'
])

const COMPLETED_HISTORY_STATUS = new Set(['completed', 'failed', 'interrupted', 'cancelled', 'missing'])

let ipcListenersRegistered = false
let historyLoadVersion = 0

function emptyItem(): DownloadItemState {
  return {
    status: 'idle',
    progress: 0,
    message: '',
    outputPath: ''
  }
}

function parseTaskKey(key: string): { bvid: string; cid: number } | null {
  const index = key.lastIndexOf(':')
  if (index <= 0) return null
  const bvid = key.slice(0, index)
  const cid = Number(key.slice(index + 1))
  if (!bvid || !Number.isFinite(cid)) return null
  return { bvid, cid }
}

function applyHistoryToState(state: DownloadItemState, record: DownloadHistoryRecord): void {
  if (state.status !== 'idle') return
  const { status: historyStatus, fileExists, outputPath: path } = record
  const fileAvailable = Boolean(path && fileExists)
  if ((historyStatus === 'completed' || historyStatus === 'missing') && fileAvailable) {
    state.status = 'success'
    state.progress = 100
    state.outputPath = path || ''
    return
  }
  if (historyStatus === 'completed' || historyStatus === 'missing') {
    state.status = 'fail'
    state.message = '文件已丢失'
    return
  }
  if (historyStatus === 'failed') {
    state.status = 'fail'
    state.message = '上次下载失败'
    return
  }
  if (historyStatus === 'cancelled') {
    state.status = 'fail'
    state.message = '已取消'
    return
  }
  state.status = 'fail'
  state.message = '上次下载未完成'
}

function syntheticVideo(record: DownloadHistoryRecord, favorite?: FavoriteResource): FavoriteResource {
  if (favorite) {
    return {
      ...favorite,
      cover: favorite.cover || record.cover || ''
    }
  }
  return {
    id: 0,
    type: 2,
    title: record.title,
    cover: record.cover || '',
    duration: 0,
    attr: 0,
    bvid: record.bvid,
    page: record.page,
    upper: {
      mid: 0,
      name: '',
      face: ''
    }
  }
}

/**
 * 下载状态全局 store：IPC 下载事件只注册一份监听，
 * 所有 DownloadStatus 通过 bvid+cid 读取共享状态
 */
export const useDownloadStore = defineStore('download', () => {
  const items = reactive<Record<string, DownloadItemState>>({})
  const pagesByBvid = reactive<Record<string, BiliVideoPage[]>>({})
  const pagesLoading = reactive<Record<string, boolean>>({})
  const pagesInflight = new Map<string, Promise<BiliVideoPage[]>>()
  const snapshots = reactive<Record<string, Omit<DownloadTaskRow, 'history'>>>({})
  const history = ref<DownloadHistoryRecord[]>([])

  const historyMap = computed(() => {
    const map = new Map<string, DownloadHistoryRecord[]>()
    for (const record of history.value) {
      const list = map.get(record.bvid) ?? []
      list.push(record)
      map.set(record.bvid, list)
    }
    return map
  })

  function getItem(bvid: string, cid: number): DownloadItemState {
    const key = downloadTaskId(bvid, cid)
    let item = items[key]
    if (!item) {
      item = emptyItem()
      items[key] = item
    }
    return item
  }

  function peekItem(bvid: string, cid: number): DownloadItemState | undefined {
    return items[downloadTaskId(bvid, cid)]
  }

  function historyFor(bvid: string, cid: number): DownloadHistoryRecord | undefined {
    const list = historyMap.value.get(bvid) ?? []
    const exact = list.find(record => record.cid === cid)
    if (exact) return exact
    const loaded = pagesByBvid[bvid]
    const isFirst = loaded?.[0]?.cid === cid
    if (cid !== 0 && (isFirst || !loaded)) {
      return list.find(record => record.cid === 0)
    }
    return undefined
  }

  function lookupFavorite(bvid: string): { video: FavoriteResource; folderName: string } | undefined {
    for (const snap of Object.values(snapshots)) {
      if (snap.video.bvid === bvid) return { video: snap.video, folderName: snap.folderName }
    }
    return undefined
  }

  function rememberTask(
    video: FavoriteResource,
    folderName: string,
    page: BiliVideoPage,
    pagesTotal: number,
    extra?: { kind?: 'ugc' | 'ogv'; epId?: number }
  ): void {
    snapshots[downloadTaskId(video.bvid, page.cid)] = {
      video: {
        ...video,
        upper: { ...video.upper },
        cnt_info: video.cnt_info ? { ...video.cnt_info } : undefined
      },
      folderName,
      page,
      pagesTotal,
      kind: extra?.kind ?? 'ugc',
      epId: extra?.epId
    }
  }

  function rowFromHistory(record: DownloadHistoryRecord): DownloadTaskRow {
    const favorite = lookupFavorite(record.bvid)
    return {
      video: syntheticVideo(record, favorite?.video),
      folderName: favorite?.folderName || record.folderName,
      page: {
        cid: record.cid,
        page: record.page,
        part: record.part,
        duration: favorite?.video.duration ?? 0
      },
      pagesTotal: Number(favorite?.video.page) > 1 ? Number(favorite?.video.page) : Math.max(record.page, 1),
      history: record
    }
  }

  function rowFor(bvid: string, cid: number, record?: DownloadHistoryRecord | null): DownloadTaskRow | null {
    const key = downloadTaskId(bvid, cid)
    const snap = snapshots[key]
    const historyRecord = record === undefined ? (historyFor(bvid, cid) ?? null) : record
    if (snap) {
      return {
        ...snap,
        video: {
          ...snap.video,
          cover: snap.video.cover || historyRecord?.cover || ''
        },
        history: historyRecord
      }
    }
    if (historyRecord) return rowFromHistory(historyRecord)
    const favorite = lookupFavorite(bvid)
    if (!favorite) return null
    const loaded = pagesByBvid[bvid]
    const page = loaded?.find(item => item.cid === cid)
    if (!page) return null
    return {
      video: favorite.video,
      folderName: favorite.folderName,
      page,
      pagesTotal: loaded?.length || Number(favorite.video.page) || 1,
      history: null
    }
  }

  function partLane(bvid: string, cid: number): DownloadPartLane {
    const item = peekItem(bvid, cid)
    if (item) {
      if (ACTIVE_STATUS.has(item.status)) return 'active'
      if (item.status === 'success' || item.status === 'fail') return 'completed'
    }
    const record = historyFor(bvid, cid)
    if (record && COMPLETED_HISTORY_STATUS.has(record.status)) return 'completed'
    if (record?.status === 'downloading' && item && ACTIVE_STATUS.has(item.status)) return 'active'
    if (record) return 'completed'
    return 'waiting'
  }

  const activeList = computed<DownloadTaskRow[]>(() => {
    const rows: DownloadTaskRow[] = []
    for (const key of Object.keys(items)) {
      const parsed = parseTaskKey(key)
      if (!parsed) continue
      if (partLane(parsed.bvid, parsed.cid) !== 'active') continue
      const row = rowFor(parsed.bvid, parsed.cid)
      if (row) rows.push(row)
    }
    return rows
  })

  const completedList = computed<DownloadTaskRow[]>(() => {
    const seen = new Set<string>()
    const rows: DownloadTaskRow[] = []
    const push = (bvid: string, cid: number, record?: DownloadHistoryRecord | null): void => {
      const key = downloadTaskId(bvid, cid)
      if (seen.has(key)) return
      if (partLane(bvid, cid) !== 'completed') return
      const row = rowFor(bvid, cid, record)
      if (!row) return
      seen.add(key)
      rows.push(row)
    }

    for (const key of Object.keys(items)) {
      const parsed = parseTaskKey(key)
      if (!parsed) continue
      push(parsed.bvid, parsed.cid)
    }
    for (const record of history.value) {
      push(record.bvid, record.cid, record)
    }
    return rows
  })

  function videoBadge(bvid: string, expectedPages = 0): VideoBadge {
    const loaded = pagesByBvid[bvid]
    const cids = new Set<number>()
    if (loaded?.length) {
      for (const page of loaded) cids.add(page.cid)
    }
    for (const record of historyMap.value.get(bvid) ?? []) cids.add(record.cid)
    for (const key of Object.keys(items)) {
      const parsed = parseTaskKey(key)
      if (parsed?.bvid === bvid) cids.add(parsed.cid)
    }

    let active = 0
    let completed = 0
    for (const cid of cids) {
      const lane = partLane(bvid, cid)
      if (lane === 'active') active += 1
      if (lane === 'completed') completed += 1
    }

    const total = loaded?.length || (expectedPages > 0 ? expectedPages : cids.size)
    if (active > 0) return { status: 'active', label: '下载中' }
    if (total > 0 && completed >= total && completed > 0) return { status: 'completed', label: '已下载完成' }
    if (completed > 0) return { status: 'partial', label: `已下载 ${completed}/${total || '?'}` }
    return { status: 'idle', label: '' }
  }

  function isCidActive(bvid: string, cid: number): boolean {
    return partLane(bvid, cid) === 'active'
  }

  function isCidCompleted(bvid: string, cid: number): boolean {
    return partLane(bvid, cid) === 'completed'
  }

  function enqueuePart(
    video: FavoriteResource,
    folderName: string,
    page: BiliVideoPage,
    pagesTotal: number,
    extra?: { kind?: 'ugc' | 'ogv'; epId?: number; qn?: number }
  ): boolean {
    const item = getItem(video.bvid, page.cid)
    if (ACTIVE_STATUS.has(item.status) || item.status === 'success') return false
    const previous = item.status
    const previousSnap = snapshots[downloadTaskId(video.bvid, page.cid)]
    const kind = extra?.kind ?? previousSnap?.kind ?? 'ugc'
    const epId = extra?.epId ?? previousSnap?.epId
    rememberTask(video, folderName, page, pagesTotal, { kind, epId })
    startDownloadVideo({
      bvid: video.bvid,
      cid: page.cid,
      page: page.page,
      pages: pagesTotal,
      part: page.part,
      title: video.title,
      uname: video.upper.name,
      folderName,
      coverUrl: video.cover,
      kind,
      epId,
      qn: extra?.qn
    })
    item.status = 'waiting'
    if (previous !== 'fail') {
      item.progress = 0
    }
    return true
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

    subscribeDownloadItemEndEvent(({ bvid, cid, success, message, outputPath, cancelled }) => {
      if (cancelled) {
        const itemKey = downloadTaskId(bvid, cid)
        if (items[itemKey]) Object.assign(items[itemKey], emptyItem())
        delete snapshots[itemKey]
        history.value = history.value.filter(record => !(record.bvid === bvid && record.cid === cid))
        return
      }
      const item = getItem(bvid, cid)
      item.status = success ? 'success' : 'fail'
      if (success) {
        item.progress = 100
      }
      item.message = message
      item.outputPath = outputPath || ''
      void refreshHistoryRecord({ bvid, cid })
    })
  }

  async function refreshHistoryRecord(key: { bvid: string; cid: number }): Promise<void> {
    try {
      const record = await getDownloadHistory(key)
      const next = history.value.filter(item => !(item.bvid === key.bvid && item.cid === key.cid))
      if (record) next.unshift(record)
      history.value = next
    } catch (error) {
      logger.warn('刷新下载历史失败:', error)
    }
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

  const loadHistory = async (): Promise<void> => {
    const version = ++historyLoadVersion
    try {
      const records = await getDownloadHistories()
      if (version !== historyLoadVersion) return
      history.value = records
      for (const record of records) {
        applyHistoryToState(getItem(record.bvid, record.cid), record)
      }
    } catch (error) {
      logger.warn('查询下载历史失败:', error)
    }
  }

  /** 清空下载历史：删除数据库记录并重置内存中的下载状态 */
  const clearHistory = async (): Promise<void> => {
    historyLoadVersion += 1
    await clearDownloadHistories()
    history.value = []
    for (const key of Object.keys(items)) {
      Object.assign(items[key], emptyItem())
    }
    for (const key of Object.keys(snapshots)) delete snapshots[key]
  }

  const removeItem = async (row: DownloadTaskRow, deleteFile = false): Promise<void> => {
    const key = { bvid: row.video.bvid, cid: row.page.cid }
    try {
      await removeDownloadHistory(key, deleteFile)
      history.value = history.value.filter(record => !(record.bvid === key.bvid && record.cid === key.cid))
      const itemKey = downloadTaskId(key.bvid, key.cid)
      if (items[itemKey]) Object.assign(items[itemKey], emptyItem())
      delete snapshots[itemKey]
      mittbus.emit('toast:add', {
        severity: 'success',
        message: deleteFile ? '已删除下载记录和文件' : '已删除下载记录'
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      mittbus.emit('toast:add', {
        severity: 'error',
        message: `删除失败: ${message}`
      })
    }
  }

  return {
    getItem,
    loadPages,
    pagesByBvid,
    pagesLoading,
    loadHistory,
    clearHistory,
    removeItem,
    history,
    partLane,
    videoBadge,
    isCidActive,
    isCidCompleted,
    rememberTask,
    enqueuePart,
    activeList,
    completedList
  }
})
