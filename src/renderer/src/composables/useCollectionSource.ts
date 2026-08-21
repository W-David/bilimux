import type { CollectionMedia, CollectionSource } from '@shared/types'
import {
  episodeToResource,
  fetchBangumiEpisodes,
  fetchFolderVideoPage,
  VIDEO_PAGE_SIZE
} from '@renderer/services/library'
import { computed, ref, type Ref } from 'vue'

export function useCollectionSource() {
  const items = ref<CollectionMedia[]>([])
  const selectedKey = ref('')
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref('')
  const pn = ref(0)
  const hasMore = ref(false)
  const source: Ref<CollectionSource | null> = ref(null)

  const selectedItem = computed(() => {
    if (loading.value) return null
    return items.value.find(item => item.key === selectedKey.value) ?? null
  })

  const load = async (page: number, append: boolean): Promise<void> => {
    if (!source.value) return
    if (append) {
      if (loadingMore.value || !hasMore.value) return
      loadingMore.value = true
    } else {
      loading.value = true
      error.value = ''
    }

    try {
      if (source.value.type === 'bangumi') {
        const season = await fetchBangumiEpisodes(source.value.item.seasonId)
        items.value = season.episodes.map(episode => ({
          key: `ep-${episode.epId}`,
          video: episodeToResource(episode, season.title, season.evaluate, season.upper),
          folderName: season.title,
          kind: 'ogv' as const,
          epId: episode.epId,
          cid: episode.cid
        }))
        hasMore.value = false
        pn.value = 1
        if (!selectedKey.value && items.value[0]) selectedKey.value = items.value[0].key
        return
      }

      const folder = source.value.folder
      const result = await fetchFolderVideoPage(folder.id, page, VIDEO_PAGE_SIZE)
      const next = result.items.map(video => ({
        key: video.bvid,
        video,
        folderName: folder.title,
        kind: 'ugc' as const
      }))
      items.value = append ? [...items.value, ...next] : next
      hasMore.value = result.hasMore
      pn.value = page
      if (!append && !selectedKey.value && items.value[0]) {
        selectedKey.value = items.value[0].key
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      if (!append) items.value = []
    } finally {
      loading.value = false
      loadingMore.value = false
    }
  }

  const open = (next: CollectionSource): void => {
    source.value = next
    items.value = []
    selectedKey.value = ''
    error.value = ''
    pn.value = 0
    hasMore.value = false
    loading.value = true
    void load(1, false)
  }

  const retry = (): void => {
    if (!source.value) return
    open(source.value)
  }

  const loadMore = (): void => {
    if (loading.value || loadingMore.value || !hasMore.value) return
    void load(pn.value + 1, true)
  }

  const clear = (): void => {
    source.value = null
    items.value = []
    selectedKey.value = ''
    error.value = ''
    pn.value = 0
    hasMore.value = false
    loading.value = false
    loadingMore.value = false
  }

  return {
    items,
    selectedKey,
    selectedItem,
    loading,
    loadingMore,
    error,
    hasMore,
    source,
    open,
    retry,
    loadMore,
    clear
  }
}
