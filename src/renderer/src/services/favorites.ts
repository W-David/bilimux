import { getFavoriteFolderInfo, getFavoriteFolders, getFavoriteResources } from '@renderer/api/network'
import type { FavoriteFolderData, FavoriteResource, FavoritesData } from '@shared/types'
import logger from 'electron-log/renderer'

export type { FavoriteFolderData, FavoritesData } from '@shared/types'

/** 获取每个收藏夹数据之间的间隔，避免请求过于频繁触发风控 */
const FOLDER_FETCH_INTERVAL_MS = 500

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 获取单个收藏夹内的全部视频（自动翻页直到取完）
 */
async function fetchAllFolderVideos(mediaId: number): Promise<FavoriteResource[]> {
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
    page += 1
  }

  return videos
}

/**
 * 一次性获取指定用户的收藏夹及每个收藏夹内的全部视频（不包含用户信息）
 * @param mid 当前登录用户的 mid，由持久化的用户信息提供
 */
export async function fetchAllFavorites(mid: number): Promise<FavoritesData> {
  const foldersRes = await getFavoriteFolders(mid)
  if (foldersRes.code !== 0) {
    throw new Error(foldersRes.message || '获取收藏夹失败')
  }

  const folderList = foldersRes.data?.list || []
  const folders: FavoriteFolderData[] = []

  for (let i = 0; i < folderList.length; i++) {
    // 每个收藏夹之间间隔 0.5s，降低触发风控的概率
    if (i > 0) {
      await sleep(FOLDER_FETCH_INTERVAL_MS)
    }

    const folder = folderList[i]
    try {
      const [videos, infoRes] = await Promise.all([fetchAllFolderVideos(folder.id), getFavoriteFolderInfo(folder.id)])

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
      logger.warn(`获取收藏夹数据失败: ${folder.title}`, error)
      folders.push({ ...folder, videos: [] })
    }
  }

  return { folders }
}
