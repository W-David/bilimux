import {
  getBangumiFollowList,
  getBangumiSeason,
  getCreatedFavoriteFolders,
  getFavoriteFolderInfo,
  getFavoriteFolders,
  getFavoriteResources,
  getVideoView
} from '@renderer/api/network'
import type {
  BangumiEpisode,
  BangumiFollowItem,
  BiliResponseType,
  FavoriteFolder,
  FavoriteResource,
  FavoriteUpper,
  VideoViewDetail
} from '@shared/types'

export type PagedResult<T> = {
  items: T[]
  hasMore: boolean
}

export const FOLDER_PAGE_SIZE = 20
export const VIDEO_PAGE_SIZE = 20
export const BANGUMI_PAGE_SIZE = 30

const emptyUpper = (): FavoriteUpper => ({ mid: 0, name: '', face: '' })

function payload<T>(res: BiliResponseType<T>): T | null {
  if (res.data != null) return res.data
  if (res.result != null) return res.result as T
  return null
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function mapUpper(raw: unknown): FavoriteUpper {
  if (!raw || typeof raw !== 'object') return emptyUpper()
  const item = raw as Record<string, unknown>
  return {
    mid: asNumber(item.mid),
    name: asString(item.name || item.uname),
    face: asString(item.face || item.avatar)
  }
}

function mapFolder(raw: unknown): FavoriteFolder {
  const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const cnt = item.cnt_info && typeof item.cnt_info === 'object' ? (item.cnt_info as Record<string, unknown>) : {}
  return {
    id: asNumber(item.id),
    fid: asNumber(item.fid),
    mid: asNumber(item.mid),
    attr: asNumber(item.attr),
    title: asString(item.title),
    media_count: asNumber(item.media_count ?? item.total),
    cover: asString(item.cover),
    intro: asString(item.intro),
    ctime: asNumber(item.ctime) || undefined,
    mtime: asNumber(item.mtime) || undefined,
    state: asNumber(item.state),
    type: asNumber(item.type) || undefined,
    upper: mapUpper(item.upper),
    cnt_info: {
      collect: asNumber(cnt.collect),
      play: asNumber(cnt.play ?? item.view_count),
      danmaku: asNumber(cnt.danmaku),
      thumb_up: asNumber(cnt.thumb_up),
      share: asNumber(cnt.share)
    }
  }
}

function mapResource(raw: unknown): FavoriteResource | null {
  const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const bvid = asString(item.bvid || item.bv_id)
  if (!bvid) return null
  const cnt = item.cnt_info && typeof item.cnt_info === 'object' ? (item.cnt_info as Record<string, unknown>) : {}
  return {
    id: asNumber(item.id),
    type: asNumber(item.type, 2),
    title: asString(item.title),
    cover: asString(item.cover),
    duration: asNumber(item.duration),
    attr: asNumber(item.attr),
    bvid,
    page: asNumber(item.page) || undefined,
    intro: asString(item.intro),
    ctime: asNumber(item.ctime) || undefined,
    pubtime: asNumber(item.pubtime) || undefined,
    upper: mapUpper(item.upper),
    cnt_info: {
      collect: asNumber(cnt.collect),
      play: asNumber(cnt.play),
      danmaku: asNumber(cnt.danmaku)
    }
  }
}

function hasMoreByCount(pn: number, ps: number, count: number, flag?: boolean): boolean {
  if (typeof flag === 'boolean') return flag
  return pn * ps < count
}

export async function fetchCreatedFolderPage(
  mid: number,
  pn: number,
  ps = FOLDER_PAGE_SIZE
): Promise<PagedResult<FavoriteFolder>> {
  const res = await getCreatedFavoriteFolders(mid, pn, ps)
  if (res.code === 0) {
    const data = payload(res)
    const list = (data?.list ?? []).map(mapFolder)
    return {
      items: list,
      hasMore: hasMoreByCount(pn, ps, data?.count ?? list.length, data?.has_more)
    }
  }

  if (pn > 1) {
    throw new Error(res.message || '获取收藏夹失败')
  }

  const fallback = await getFavoriteFolders(mid)
  if (fallback.code !== 0) {
    throw new Error(fallback.message || res.message || '获取收藏夹失败')
  }
  const folders = (fallback.data?.list ?? []).map(mapFolder)
  const enriched = await Promise.all(
    folders.map(async folder => {
      if (folder.cover && folder.ctime) return folder
      try {
        const info = await getFavoriteFolderInfo(folder.id)
        if (info.code !== 0 || !info.data) return folder
        return { ...folder, ...mapFolder(info.data), id: folder.id, title: folder.title || asString(info.data.title) }
      } catch {
        return folder
      }
    })
  )
  return { items: enriched, hasMore: false }
}

export async function fetchFolderVideoPage(
  mediaId: number,
  pn: number,
  ps = VIDEO_PAGE_SIZE
): Promise<PagedResult<FavoriteResource>> {
  const res = await getFavoriteResources(mediaId, pn, ps)
  if (res.code !== 0) {
    throw new Error(res.message || '获取收藏内容失败')
  }
  const medias = res.data?.medias ?? []
  const items = medias.map(mapResource).filter((item): item is FavoriteResource => Boolean(item && item.type === 2))
  return {
    items,
    hasMore: Boolean(res.data?.has_more)
  }
}

function mapBangumiFollow(raw: unknown): BangumiFollowItem | null {
  const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const seasonId = asNumber(item.season_id)
  if (!seasonId) return null
  const newEp = item.new_ep && typeof item.new_ep === 'object' ? (item.new_ep as Record<string, unknown>) : {}
  return {
    seasonId,
    mediaId: asNumber(item.media_id),
    title: asString(item.title),
    cover: asString(item.cover),
    squareCover: asString(item.square_cover),
    badge: asString(item.badge),
    isFinish: asNumber(item.is_finish),
    totalCount: asNumber(item.total_count),
    newEpIndexShow: asString(newEp.index_show),
    progress: asString(item.progress) || '尚未观看',
    evaluate: asString(item.evaluate),
    seasonType: asNumber(item.season_type, 1)
  }
}

export async function fetchBangumiFollowPage(
  mid: number,
  type: 1 | 2,
  pn: number,
  ps = BANGUMI_PAGE_SIZE
): Promise<PagedResult<BangumiFollowItem>> {
  const res = await getBangumiFollowList(mid, type, pn, ps)
  if (res.code !== 0) {
    throw new Error(res.message || (type === 1 ? '获取追番失败' : '获取追剧失败'))
  }
  const data = payload(res)
  const items = (data?.list ?? []).map(mapBangumiFollow).filter((item): item is BangumiFollowItem => Boolean(item))
  const total = data?.total ?? items.length
  return {
    items,
    hasMore: pn * ps < total
  }
}

function normalizeEpisodeDuration(value: number): number {
  if (value > 100_000) return Math.round(value / 1000)
  return value
}

export async function fetchBangumiEpisodes(seasonId: number): Promise<{
  title: string
  evaluate: string
  cover: string
  upper: FavoriteUpper
  episodes: BangumiEpisode[]
}> {
  const res = await getBangumiSeason(seasonId)
  if (res.code !== 0) {
    throw new Error(res.message || '获取剧集分集失败')
  }
  const data = payload(res)
  if (!data) {
    throw new Error('获取剧集分集失败')
  }
  const up = data.up_info
  return {
    title: data.title,
    evaluate: data.evaluate || '',
    cover: data.cover,
    upper: {
      mid: up?.mid ?? 0,
      name: up?.uname ?? '',
      face: up?.avatar ?? ''
    },
    episodes: (data.episodes ?? []).map(item => ({
      epId: item.id,
      aid: item.aid,
      bvid: item.bvid,
      cid: item.cid,
      title: item.title,
      longTitle: item.long_title,
      cover: item.cover,
      pubTime: item.pub_time,
      duration: normalizeEpisodeDuration(item.duration),
      badge: item.badge || ''
    }))
  }
}

export function episodeToResource(
  episode: BangumiEpisode,
  seasonTitle: string,
  evaluate: string,
  upper: FavoriteUpper
): FavoriteResource {
  const partTitle = episode.longTitle || `第${episode.title}话`
  return {
    id: episode.aid,
    type: 2,
    title: `${seasonTitle} ${partTitle}`.trim(),
    cover: episode.cover,
    duration: episode.duration,
    attr: 0,
    bvid: episode.bvid,
    page: 1,
    intro: evaluate,
    pubtime: episode.pubTime,
    upper
  }
}

export async function fetchVideoDetail(bvid: string): Promise<VideoViewDetail> {
  const res = await getVideoView(bvid)
  if (res.code !== 0 || !res.data) {
    throw new Error(res.message || '获取视频详情失败')
  }
  const data = res.data
  const descV2 = (data.desc_v2 ?? [])
    .map(item => item.raw_text?.trim() ?? '')
    .filter(Boolean)
    .join('\n')
  return {
    bvid: data.bvid,
    title: data.title,
    cover: data.pic,
    desc: data.desc?.trim() || descV2,
    pubdate: data.pubdate,
    duration: data.duration,
    owner: {
      mid: data.owner.mid,
      name: data.owner.name,
      face: data.owner.face
    }
  }
}
