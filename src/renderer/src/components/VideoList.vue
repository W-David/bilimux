<template>
  <div class="min-w-0 flex flex-1 flex-col overflow-hidden">
    <div
      v-if="errorMessage"
      class="flex flex-1 flex-col items-center justify-center gap-4">
      <div class="text-sm text-red-400">{{ errorMessage }}</div>
      <Button
        size="sm"
        variant="destructive"
        @click="emit('retry')">
        <RefreshCwIcon data-icon="inline-start" />
        重试
      </Button>
    </div>

    <div
      v-else-if="currentFolder?.fetchError"
      class="flex flex-1 flex-col items-center justify-center gap-4">
      <div class="text-sm text-red-400">{{ currentFolder.fetchError }}</div>
      <Button
        size="sm"
        variant="destructive"
        @click="emit('retry')">
        <RefreshCwIcon data-icon="inline-start" />
        重试
      </Button>
    </div>

    <div
      v-else-if="!currentFolder"
      class="flex flex-1 items-center justify-center text-sm text-gray-400">
      请选择左侧收藏夹
    </div>

    <div
      v-else
      class="min-h-0 flex flex-1 flex-col">
      <div
        v-if="downloadStore.multiSelectMode"
        class="flex flex-none items-center border-b border-[#1f1f1f] px-3 py-2">
        <button
          type="button"
          class="relative h-8 min-w-28 flex cursor-pointer select-none items-center justify-center overflow-hidden rounded-full px-3 text-xs text-pink-400 card-glassy hover:ring-1 hover:ring-pink-400/20 disabled:opacity-50"
          :disabled="selectableVideos.length === 0"
          @click="toggleSelectAll">
          {{ allSelected ? '取消全选当前收藏夹' : '全选当前收藏夹' }}
        </button>
      </div>
      <div
        v-if="videos.length === 0"
        class="flex flex-1 items-center justify-center text-sm text-gray-400">
        该收藏夹暂无视频
      </div>
      <div
        v-else
        ref="scrollRoot"
        class="min-h-0 flex-1 overflow-y-auto p-3"
        @scroll="onScroll">
        <div :style="{ height: `${totalHeight}px`, position: 'relative' }">
          <div
            class="flex flex-col"
            :style="{ transform: `translateY(${offsetY}px)` }">
            <div
              v-for="video in visibleVideos"
              :key="video.bvid"
              :style="{ height: `${heightOf(video)}px` }">
              <VideoItem
                :video="video"
                :folder-name="currentFolder.title"
                :folder-id="currentFolder.id"
                :histories="historyMap.get(video.bvid)"
                @resize="height => onItemResize(video.bvid, height)"></VideoItem>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RefreshCw as RefreshCwIcon } from '@lucide/vue'
import { useDownloadStore } from '@renderer/store/download'
import type { DownloadHistoryRecord, FavoriteFolderData, FavoriteResource } from '@shared/types'
import { computed, reactive, ref, watch } from 'vue'
import VideoItem from './VideoItem.vue'

const props = defineProps<{
  videos: FavoriteResource[]
  errorMessage: string
  currentFolder: FavoriteFolderData | null
  historyMap: Map<string, DownloadHistoryRecord[]>
}>()

const emit = defineEmits<{
  (e: 'retry'): void
}>()

const ITEM_HEIGHT = 112
const LIST_GAP = 12
const OVERSCAN = 4

const scrollRoot = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const viewportHeight = ref(600)
const heightMap = reactive<Record<string, number>>({})
const downloadStore = useDownloadStore()

const selectableVideos = computed(() => props.videos.filter(video => video.attr === 0))
const allSelected = computed(
  () => selectableVideos.value.length > 0 && selectableVideos.value.every(video => downloadStore.isSelected(video.bvid))
)

const toggleSelectAll = (): void => {
  const folder = props.currentFolder
  if (!folder) return
  if (allSelected.value) {
    downloadStore.deselectVideos(selectableVideos.value.map(video => video.bvid))
    return
  }
  downloadStore.selectVideos(selectableVideos.value, folder.title, folder.id)
}

const heightOf = (video: FavoriteResource): number => heightMap[video.bvid] ?? ITEM_HEIGHT

const onItemResize = (bvid: string, height: number): void => {
  const next = height + LIST_GAP
  if (heightMap[bvid] !== next) heightMap[bvid] = next
}

const offsets = computed(() => {
  const list = props.videos
  const offs = new Array<number>(list.length + 1)
  offs[0] = 0
  for (let i = 0; i < list.length; i++) {
    offs[i + 1] = offs[i] + heightOf(list[i])
  }
  return offs
})

const totalHeight = computed(() => offsets.value[offsets.value.length - 1] ?? 0)

const visibleRange = computed(() => {
  const list = props.videos
  const n = list.length
  if (n === 0) return { start: 0, end: 0 }
  const offs = offsets.value
  const top = scrollTop.value
  const bottom = top + viewportHeight.value
  let start = 0
  while (start < n && (offs[start + 1] ?? 0) <= top) start++
  start = Math.max(0, start - OVERSCAN)
  let end = start
  while (end < n && (offs[end] ?? 0) < bottom) end++
  end = Math.min(n, end + OVERSCAN)
  return { start, end }
})

const visibleVideos = computed(() => props.videos.slice(visibleRange.value.start, visibleRange.value.end))
const offsetY = computed(() => offsets.value[visibleRange.value.start] ?? 0)

const onScroll = (): void => {
  const el = scrollRoot.value
  if (!el) return
  scrollTop.value = el.scrollTop
  viewportHeight.value = el.clientHeight
}

watch(
  () => props.currentFolder?.id,
  () => {
    downloadStore.setExpanded(null)
    scrollTop.value = 0
    if (scrollRoot.value) scrollRoot.value.scrollTop = 0
  }
)
</script>
