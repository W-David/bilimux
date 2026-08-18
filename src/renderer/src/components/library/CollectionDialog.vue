<template>
  <Dialog
    :open="open"
    @update:open="onOpenChange">
    <DialogContent
      class="flex h-[min(44rem,calc(100vh-3.5rem))] w-[min(64rem,calc(100vw-2.5rem))] max-w-[min(64rem,calc(100vw-2.5rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(64rem,calc(100vw-2.5rem))]">
      <DialogHeader class="shrink-0 space-y-0 px-5 pt-4 text-left">
        <p class="text-xs tracking-wide text-gray-500">{{ catalogLabel }}</p>
        <DialogTitle class="mt-1.5 text-base">{{ title }}</DialogTitle>
        <DialogDescription
          v-if="subtitle"
          class="mt-1 text-xs text-gray-500">
          {{ subtitle }}
        </DialogDescription>
        <DialogDescription
          v-else
          class="sr-only">
          {{ catalogLabel }} · {{ title }}
        </DialogDescription>
      </DialogHeader>
      <Separator class="mt-3 bg-[#1f1f1f]" />

      <div
        v-if="error && !loading"
        class="min-h-0 flex flex-1 flex-col items-center justify-center gap-3 px-5">
        <p class="text-sm text-red-400">{{ error }}</p>
        <Button
          size="sm"
          variant="outline"
          @click="reload">
          重试
        </Button>
      </div>
      <div
        v-else
        class="min-h-0 flex flex-1">
        <div class="min-w-0 flex flex-1 flex-col py-4 px-5">
          <CollectionMediaPanel :payload="selectedItem" />
        </div>
        <Separator
          orientation="vertical"
          class="bg-[#1f1f1f]" />
        <div class="flex w-72 shrink-0 flex-col">
          <div
            ref="scrollRoot"
            class="min-h-0 flex-1 overflow-y-auto px-3 py-3"
            @scroll="onScroll">
            <div
              v-if="loading"
              class="flex flex-col gap-2">
              <div
                v-for="i in 4"
                :key="i"
                class="card-border overflow-hidden rounded-xl">
                <Skeleton class="aspect-video w-full rounded-none" />
                <div class="flex flex-col gap-1.5 px-3 py-2.5">
                  <Skeleton class="h-4 w-4/5" />
                  <Skeleton class="h-[11px] w-2/5" />
                </div>
              </div>
            </div>
            <div
              v-else-if="items.length === 0"
              class="px-2 py-10 text-center text-xs text-gray-500">
              暂无内容
            </div>
            <div
              v-else
              class="flex flex-col gap-2">
              <CollectionListItem
                v-for="item in items"
                :key="item.key"
                :video="item.video"
                :active="item.key === selectedKey"
                @select="selectedKey = item.key" />
            </div>
            <div
              v-if="loadingMore"
              class="mt-2 flex flex-col gap-2">
              <div
                v-for="i in 2"
                :key="`more-${i}`"
                class="card-border overflow-hidden rounded-xl">
                <Skeleton class="aspect-video w-full rounded-none" />
                <div class="flex flex-col gap-1.5 px-3 py-2.5">
                  <Skeleton class="h-4 w-4/5" />
                  <Skeleton class="h-[11px] w-2/5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import CollectionListItem from '@renderer/components/library/CollectionListItem.vue'
import CollectionMediaPanel from '@renderer/components/library/CollectionMediaPanel.vue'
import type { CollectionMedia, CollectionSource } from '@renderer/components/library/types'
import {
  episodeToResource,
  fetchBangumiEpisodes,
  fetchFolderVideoPage,
  VIDEO_PAGE_SIZE
} from '@renderer/services/library'
import { formatDate, isPrivateFolder } from '@renderer/utils/media'
import { computed, ref, watch } from 'vue'

export type { CollectionMedia, CollectionSource }

const props = defineProps<{
  open: boolean
  source: CollectionSource | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const items = ref<CollectionMedia[]>([])
const selectedKey = ref('')
const loading = ref(false)
const loadingMore = ref(false)
const error = ref('')
const pn = ref(0)
const hasMore = ref(false)
const scrollRoot = ref<HTMLElement | null>(null)

const catalogLabel = computed(() => {
  if (!props.source) return ''
  if (props.source.type === 'folder') return '我的收藏'
  return props.source.catalog === 'cinema' ? '追剧' : '番剧'
})

const title = computed(() => {
  if (!props.source) return ''
  return props.source.type === 'folder' ? props.source.folder.title : props.source.item.title
})

const subtitle = computed(() => {
  if (!props.source) return ''
  if (props.source.type === 'folder') {
    const folder = props.source.folder
    const parts = [`${folder.media_count}个内容`, isPrivateFolder(folder) ? '私密' : '公开']
    if (folder.ctime) parts.push(`创建于${formatDate(folder.ctime)}`)
    return parts.join(' · ')
  }
  const item = props.source.item
  return [item.newEpIndexShow, item.progress].filter(Boolean).join(' · ')
})

const selectedItem = computed(() => {
  if (loading.value) return null
  return items.value.find(item => item.key === selectedKey.value) ?? null
})

const onOpenChange = (value: boolean): void => {
  emit('update:open', value)
}

const load = async (page: number, append: boolean): Promise<void> => {
  if (!props.source) return
  if (append) {
    if (loadingMore.value || !hasMore.value) return
    loadingMore.value = true
  } else {
    loading.value = true
    error.value = ''
  }

  try {
    if (props.source.type === 'bangumi') {
      const season = await fetchBangumiEpisodes(props.source.item.seasonId)
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

    const folder = props.source.folder
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

const reload = (): void => {
  items.value = []
  selectedKey.value = ''
  error.value = ''
  pn.value = 0
  hasMore.value = false
  loading.value = true
  void load(1, false)
}

const onScroll = (): void => {
  const el = scrollRoot.value
  if (!el || loading.value || loadingMore.value || !hasMore.value) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
    void load(pn.value + 1, true)
  }
}

watch(
  () => [props.open, props.source] as const,
  ([open]) => {
    if (!open || !props.source) return
    reload()
  }
)
</script>
