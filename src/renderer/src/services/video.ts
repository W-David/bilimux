import { getVideoView } from '@renderer/api/network'
import type { BiliVideoPage } from '@shared/types'

/**
 * 拉取稿件分 P 列表；单 P 时仍返回一条
 */
export async function fetchVideoPages(bvid: string): Promise<BiliVideoPage[]> {
  const res = await getVideoView(bvid)
  if (res.code !== 0 || !res.data) {
    throw new Error(res.message || '获取视频信息失败')
  }

  const pages = res.data.pages ?? []
  if (pages.length > 0) {
    return pages.map(page => ({
      cid: page.cid,
      page: page.page,
      part: page.part || res.data?.title || '',
      duration: page.duration ?? 0
    }))
  }

  if (res.data.cid) {
    return [{ cid: res.data.cid, page: 1, part: res.data.title || '', duration: 0 }]
  }

  throw new Error('获取视频分P失败')
}
