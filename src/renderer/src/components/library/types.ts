import type { BangumiFollowItem, FavoriteFolder, FavoriteResource } from '@shared/types'

export type CollectionSource =
  | { type: 'folder'; folder: FavoriteFolder }
  | { type: 'bangumi'; item: BangumiFollowItem; catalog: 'bangumi' | 'cinema' }

export type CollectionMedia = {
  key: string
  video: FavoriteResource
  folderName: string
  kind: 'ugc' | 'ogv'
  epId?: number
  cid?: number
}
