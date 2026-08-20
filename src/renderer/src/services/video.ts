import { getVideoPageList } from '@renderer/api/network'
import type { BiliVideoPage } from '@shared/types'

/**
 * 用 pagelist 拉取分 P；失败不回退到稿件 1P 的 cid
 */
export async function fetchVideoPages(bvid: string): Promise<BiliVideoPage[]> {
  const res = await getVideoPageList(bvid)
  if (res.code !== 0) {
    throw new Error(res.message || '获取分P失败')
  }

  const list = Array.isArray(res.data) ? res.data : []
  const pages = list
    .filter(item => Number.isFinite(item.cid) && item.cid > 0)
    .map((item, index) => {
      const page = item.page > 0 ? item.page : index + 1
      return {
        cid: item.cid,
        page,
        part: item.part || `P${page}`,
        duration: item.duration ?? 0
      }
    })

  if (pages.length === 0) {
    throw new Error('获取视频分P失败')
  }

  return pages
}
