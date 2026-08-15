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
      <div class="flex flex-none flex-col gap-2 border-b border-[#1f1f1f] p-3">
        <Search
          v-model="query"
          @search="onSearchSubmit" />
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="relative h-8 min-w-16 flex cursor-pointer select-none items-center justify-center overflow-hidden rounded-full px-3 text-xs text-pink-400 card-glassy hover:ring-1 hover:ring-pink-400/20"
              @click="toggleSelectAll">
              {{ allSelected ? '取消全选' : '全选' }}
            </button>
            <span class="text-xs text-gray-500">已选 {{ selectedBvids.size }}</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="relative h-8 min-w-20 flex cursor-pointer select-none items-center justify-center overflow-hidden rounded-full px-3 text-xs text-pink-400 card-glassy hover:ring-1 hover:ring-pink-400/20 disabled:opacity-50"
              :disabled="selectedBvids.size === 0 || downloading"
              @click="downloadSelected">
              下载所选
            </button>
            <button
              type="button"
              class="relative h-8 min-w-20 flex cursor-pointer select-none items-center justify-center overflow-hidden rounded-full px-3 text-xs text-pink-400 card-glassy hover:ring-1 hover:ring-pink-400/20 disabled:opacity-50"
              :disabled="validVideos.length === 0 || downloading"
              @click="downloadAll">
              全部下载
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="filteredVideos.length === 0"
        class="flex flex-1 items-center justify-center text-sm text-gray-400">
        {{ videos.length === 0 ? '该收藏夹暂无视频' : '没有匹配的视频' }}
      </div>
      <div
        v-else
        ref="scrollRoot"
        class="min-h-0 flex-1 overflow-y-auto p-3"
        @scroll="onScroll">
        <div :style="{ height: `${totalHeight}px`, position: 'relative' }">
          <div
            class="flex flex-col gap-3"
            :style="{ transform: `translateY(${offsetY}px)` }">
            <VideoItem
              v-for="video in visibleVideos"
              :key="video.bvid"
              :video="video"
              :folder-name="currentFolder.title"
              :histories="historyMap.get(video.bvid)"
              selectable
              :selected="selectedBvids.has(video.bvid)"
              @toggle="toggleVideo"></VideoItem>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RefreshCw as RefreshCwIcon } from '@lucide/vue'
import { startDownloadVideo } from '@renderer/api'
import Search from '@renderer/components/Search.vue'
import { mittbus } from '@renderer/ipc'
import { fetchVideoPages, parseBvid } from '@renderer/services/video'
import { useDownloadStore } from '@renderer/store/download'
import type { DownloadHistoryRecord, FavoriteFolderData, FavoriteResource } from '@shared/types'
import { computed, ref, watch } from 'vue'
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
const OVERSCAN = 4

const query = ref('')
const selectedBvids = ref<Set<string>>(new Set())
const downloading = ref(false)
const scrollRoot = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const viewportHeight = ref(600)
const downloadStore = useDownloadStore()

const validVideos = computed(() => props.videos.filter(video => video.attr === 0))

const filteredVideos = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword || parseBvid(keyword)) return props.videos
  return props.videos.filter(
    video => video.title.toLowerCase().includes(keyword) || video.upper.name.toLowerCase().includes(keyword)
  )
})

const totalHeight = computed(() => filteredVideos.value.length * ITEM_HEIGHT)

const visibleRange = computed(() => {
  const start = Math.max(0, Math.floor(scrollTop.value / ITEM_HEIGHT) - OVERSCAN)
  const count = Math.ceil(viewportHeight.value / ITEM_HEIGHT) + OVERSCAN * 2
  const end = Math.min(filteredVideos.value.length, start + count)
  return { start, end }
})

const visibleVideos = computed(() => filteredVideos.value.slice(visibleRange.value.start, visibleRange.value.end))
const offsetY = computed(() => visibleRange.value.start * ITEM_HEIGHT)

const allSelected = computed(() => {
  const selectable = validVideos.value.filter(video => filteredVideos.value.includes(video))
  return selectable.length > 0 && selectable.every(video => selectedBvids.value.has(video.bvid))
})

const onScroll = (): void => {
  const el = scrollRoot.value
  if (!el) return
  scrollTop.value = el.scrollTop
  viewportHeight.value = el.clientHeight
}

watch(
  () => props.currentFolder?.id,
  () => {
    selectedBvids.value = new Set()
    query.value = ''
    scrollTop.value = 0
  }
)

const toggleVideo = (bvid: string): void => {
  const next = new Set(selectedBvids.value)
  if (next.has(bvid)) next.delete(bvid)
  else next.add(bvid)
  selectedBvids.value = next
}

const toggleSelectAll = (): void => {
  const selectable = validVideos.value.filter(video => filteredVideos.value.includes(video))
  if (allSelected.value) {
    const next = new Set(selectedBvids.value)
    for (const video of selectable) next.delete(video.bvid)
    selectedBvids.value = next
    return
  }
  const next = new Set(selectedBvids.value)
  for (const video of selectable) next.add(video.bvid)
  selectedBvids.value = next
}

const enqueueVideo = async (video: FavoriteResource, folderName: string): Promise<void> => {
  const pages = await downloadStore.loadPages(video.bvid)
  for (const page of pages) {
    const item = downloadStore.getItem(video.bvid, page.cid)
    if (['success', 'downloading', 'waiting', 'preprocess', 'importing', 'writing'].includes(item.status)) {
      continue
    }
    startDownloadVideo({
      bvid: video.bvid,
      cid: page.cid,
      page: page.page,
      pages: pages.length,
      part: page.part,
      title: video.title,
      uname: video.upper.name,
      folderName,
      coverUrl: video.cover
    })
    item.status = 'waiting'
  }
}

const downloadByQuery = async (value: string): Promise<void> => {
  const bvid = parseBvid(value)
  if (!bvid) return
  downloading.value = true
  try {
    const pages = await fetchVideoPages(bvid)
    const folderName = props.currentFolder?.title || '手动添加'
    for (const page of pages) {
      startDownloadVideo({
        bvid,
        cid: page.cid,
        page: page.page,
        pages: pages.length,
        part: page.part,
        title: page.part || bvid,
        uname: 'UP',
        folderName
      })
      downloadStore.getItem(bvid, page.cid).status = 'waiting'
    }
    mittbus.emit('toast:add', {
      severity: 'success',
      message: `已加入下载：${bvid}（${pages.length}P）`
    })
  } catch (error) {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: error instanceof Error ? error.message : String(error)
    })
  } finally {
    downloading.value = false
  }
}

const onSearchSubmit = (value: string): void => {
  if (parseBvid(value)) {
    void downloadByQuery(value)
  }
}

const downloadSelected = async (): Promise<void> => {
  const folderName = props.currentFolder?.title || ''
  const targets = validVideos.value.filter(video => selectedBvids.value.has(video.bvid))
  downloading.value = true
  try {
    for (const video of targets) {
      await enqueueVideo(video, folderName)
    }
  } catch (error) {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: error instanceof Error ? error.message : String(error)
    })
  } finally {
    downloading.value = false
  }
}

const downloadAll = async (): Promise<void> => {
  const folderName = props.currentFolder?.title || ''
  downloading.value = true
  try {
    for (const video of validVideos.value) {
      await enqueueVideo(video, folderName)
    }
  } catch (error) {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: error instanceof Error ? error.message : String(error)
    })
  } finally {
    downloading.value = false
  }
}
</script>
