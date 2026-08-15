import { getFavoriteFolderInfo, getFavoriteFolders, getFavoriteResources } from '@renderer/api/network'
import type { FavoriteFolderData, FavoriteResource, FavoritesData } from '@shared/types'
import logger from 'electron-log/renderer'

export type { FavoriteFolderData, FavoritesData } from '@shared/types'

export type FavoritesFetchPhase = 'list' | 'folder' | 'done'

/** 收藏夹一次性获取的进度信息 */
export type FavoritesFetchProgress = {
  running: boolean
  phase: FavoritesFetchPhase
  /** 0-100 */
  percent: number
  /** 1-based，非收藏夹阶段为 0 */
  currentFolderIndex: number
  totalFolders: number
  currentFolderTitle: string
  /** 当前收藏夹已获取到的视频页码，0 表示尚未翻页 */
  currentVideoPage: number
}

/** 获取每个收藏夹数据之间的间隔，避免请求过于频繁触发风控 */
const FOLDER_FETCH_INTERVAL_MS = 500

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 获取单个收藏夹内的全部视频（自动翻页直到取完）
 */
async function fetchAllFolderVideos(mediaId: number, onPage?: (page: number) => void): Promise<FavoriteResource[]> {
  const videos: FavoriteResource[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const res = await getFavoriteResources(mediaId, page, 20)
    if (res.code !== 0) {
      throw new Error(res.message || '获取收藏视频失败')
    }
    videos.push(...(res.data?.medias || []).filter(item => item.type === 2))
    hasMore = Boolean(res.data?.has_more)
    onPage?.(page)
    page += 1
  }

  return videos
}

/**
 * 一次性获取指定用户的收藏夹及每个收藏夹内的全部视频（不包含用户信息）
 * @param mid 当前登录用户的 mid，由持久化的用户信息提供
 */
export async function fetchAllFavorites(
  mid: number,
  onProgress?: (progress: FavoritesFetchProgress) => void
): Promise<FavoritesData> {
  const report = (progress: FavoritesFetchProgress): void => {
    onProgress?.(progress)
  }

  report({
    running: true,
    phase: 'list',
    percent: 0,
    currentFolderIndex: 0,
    totalFolders: 0,
    currentFolderTitle: '',
    currentVideoPage: 0
  })

  const foldersRes = await getFavoriteFolders(mid)
  if (foldersRes.code !== 0) {
    throw new Error(foldersRes.message || '获取收藏夹失败')
  }

  const folderList = foldersRes.data?.list || []
  const totalFolders = folderList.length
  const folders: FavoriteFolderData[] = []

  if (totalFolders === 0) {
    report({
      running: false,
      phase: 'done',
      percent: 100,
      currentFolderIndex: 0,
      totalFolders: 0,
      currentFolderTitle: '',
      currentVideoPage: 0
    })
    return { folders }
  }

  for (let i = 0; i < folderList.length; i++) {
    // 每个收藏夹之间间隔 0.5s，降低触发风控的概率
    if (i > 0) {
      await sleep(FOLDER_FETCH_INTERVAL_MS)
    }

    const folder = folderList[i]
    const folderStartPercent = 5 + (i / totalFolders) * 90
    const reportFolder = (currentVideoPage = 0): void => {
      report({
        running: true,
        phase: 'folder',
        percent: folderStartPercent,
        currentFolderIndex: i + 1,
        totalFolders,
        currentFolderTitle: folder.title,
        currentVideoPage
      })
    }
    reportFolder()

    try {
      const [videos, infoRes] = await Promise.all([
        fetchAllFolderVideos(folder.id, page => reportFolder(page)),
        getFavoriteFolderInfo(folder.id)
      ])

      const folderData: FavoriteFolderData = {
        ...folder,
        ...(infoRes.code === 0 && infoRes.data ? infoRes.data : {}),
        videos
      }
      // 收藏夹没有封面时，默认取第一个视频的封面
      if (!folderData.cover && videos[0]?.cover) {
        folderData.cover = videos[0].cover
      }
      folders.push(folderData)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.warn(`获取收藏夹数据失败: ${folder.title}`, error)
      folders.push({ ...folder, videos: [], fetchError: message })
    }
  }

  report({
    running: false,
    phase: 'done',
    percent: 100,
    currentFolderIndex: totalFolders,
    totalFolders,
    currentFolderTitle: folderList[totalFolders - 1]?.title ?? '',
    currentVideoPage: 0
  })

  return { folders }
}
