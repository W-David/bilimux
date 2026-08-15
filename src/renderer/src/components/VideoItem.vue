<template>
  <div class="card-border cursor-pointer rounded-2xl p-3">
    <div class="flex items-center gap-3">
      <div class="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-gray-900">
        <img
          v-if="video.cover"
          :src="safeCover(video.cover)"
          referrerpolicy="no-referrer"
          class="h-full w-full object-cover"
          alt="" />
        <div
          v-else
          class="h-full w-full flex items-center justify-center text-xl text-gray-600">
          <TvIcon class="size-6" />
        </div>
        <span class="absolute bottom-1 right-1 rounded-sm bg-black/60 px-1 py-0.5 text-[10px] text-[#f6f6f6]">
          {{ formatDuration(video.duration) }}
        </span>
      </div>

      <div class="min-w-0 flex-1">
        <div class="mb-4 flex items-center gap-2">
          <div class="truncate text-sm text-[#f6f6f6] font-medium">{{ video.title }}</div>
          <span
            v-if="isMultiPage"
            class="shrink-0 rounded-sm bg-pink-400/20 px-1.5 py-0.5 text-[10px] text-pink-400">
            {{ pages!.length }}P
          </span>
        </div>
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0 flex items-center gap-1 text-xs text-gray-400">
            <span
              class="h-4 w-6 flex shrink-0 items-center justify-center rounded-sm bg-pink-400/20 text-[9px] text-pink-400 font-bold leading-none">
              UP
            </span>
            <span class="truncate">{{ video.upper.name }}</span>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <template v-if="video.attr !== 0">
              <span class="text-xs text-gray-500">已失效</span>
            </template>
            <template v-else-if="isMultiPage">
              <Button
                size="sm"
                variant="outline"
                :disabled="pagesLoading"
                @click.stop="downloadAllPages">
                全部下载
              </Button>
              <Button
                size="sm"
                variant="ghost"
                @click.stop="expanded = !expanded">
                {{ expanded ? '收起' : '分P' }}
              </Button>
            </template>
            <DownloadStatus
              v-else-if="singlePage"
              :video="video"
              :page="singlePage"
              :pages-total="1"
              :folder-name="folderName"
              :history="historyFor(singlePage.cid)"></DownloadStatus>
            <template v-else>
              <button
                v-if="legacyPlayable"
                type="button"
                class="relative h-8 min-w-20 flex cursor-pointer select-none items-center justify-center overflow-hidden rounded-full px-2 text-xs text-green-400 transition-all duration-200 card-glassy hover:ring-1 hover:ring-green-400/20"
                @click.stop="playLegacy">
                播放
              </button>
              <button
                type="button"
                class="relative h-8 min-w-20 flex cursor-pointer select-none items-center justify-center overflow-hidden rounded-full px-2 text-xs text-pink-400 transition-all duration-200 card-glassy hover:ring-1 hover:ring-pink-400/20 disabled:opacity-60"
                :disabled="pagesLoading"
                @click.stop="onEntryClick">
                <Spinner
                  v-if="pagesLoading"
                  class="size-4" />
                <span v-else>{{ legacyPlayable ? '分P' : '下载' }}</span>
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="expanded && isMultiPage"
      class="mt-3 flex flex-col gap-2 border-t border-white/5 pt-3">
      <div
        v-for="page in pages"
        :key="page.cid"
        class="flex items-center justify-between gap-3">
        <div class="min-w-0 truncate text-xs text-gray-400">P{{ page.page }} {{ page.part }}</div>
        <DownloadStatus
          :video="video"
          :page="page"
          :pages-total="pages!.length"
          :folder-name="folderName"
          :history="historyFor(page.cid)"></DownloadStatus>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Tv as TvIcon } from '@lucide/vue'
import { openPath, startDownloadVideo } from '@renderer/api'
import DownloadStatus from '@renderer/components/DownloadStatus.vue'
import { mittbus } from '@renderer/ipc'
import { useDownloadStore } from '@renderer/store/download'
import { formatDuration, safeCover } from '@renderer/utils/media'
import type { BiliVideoPage, DownloadHistoryRecord, FavoriteResource } from '@shared/types'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'

const props = defineProps<{
  video: FavoriteResource
  folderName: string
  histories?: DownloadHistoryRecord[]
}>()

const downloadStore = useDownloadStore()
const { pagesByBvid, pagesLoading: pagesLoadingMap } = storeToRefs(downloadStore)

const expanded = ref(false)
const pages = computed(() => pagesByBvid.value[props.video.bvid] ?? null)
const pagesLoading = computed(() => Boolean(pagesLoadingMap.value[props.video.bvid]))
const isMultiPage = computed(() => (pages.value?.length ?? 0) > 1)
const singlePage = computed<BiliVideoPage | null>(() => (pages.value?.length === 1 ? pages.value[0] : null))

const histories = computed(() => props.histories ?? [])

const firstCid = computed(() => pages.value?.[0]?.cid)

const historyFor = (cid: number): DownloadHistoryRecord | null => {
  const matched = histories.value.find(item => item.cid === cid)
  if (matched) return matched
  if (firstCid.value !== undefined && cid === firstCid.value) {
    return histories.value.find(item => item.cid === 0) ?? null
  }
  return null
}

const legacyCompleted = computed(() =>
  histories.value.find(
    item => (item.status === 'completed' || item.status === 'missing') && item.outputPath && item.fileExists
  )
)

const legacyPlayable = computed(() => Boolean(legacyCompleted.value))

const playLegacy = async (): Promise<void> => {
  const path = legacyCompleted.value?.outputPath
  if (!path) return
  const errMessage = await openPath(path)
  if (errMessage) {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: errMessage
    })
  }
}

const ensurePages = async (): Promise<BiliVideoPage[]> => {
  return downloadStore.loadPages(props.video.bvid)
}

const onEntryClick = async (): Promise<void> => {
  try {
    const list = await ensurePages()
    if (list.length > 1) {
      expanded.value = true
      return
    }
    const page = list[0]
    if (!page) return
    const item = downloadStore.getItem(props.video.bvid, page.cid)
    if (item.status === 'success' || item.status === 'downloading' || item.status === 'waiting') return
    startDownloadVideo({
      bvid: props.video.bvid,
      cid: page.cid,
      page: page.page,
      pages: list.length,
      part: page.part,
      title: props.video.title,
      uname: props.video.upper.name,
      folderName: props.folderName,
      coverUrl: props.video.cover
    })
    item.status = 'waiting'
  } catch (error) {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: error instanceof Error ? error.message : String(error)
    })
  }
}

const downloadAllPages = async (): Promise<void> => {
  try {
    const list = await ensurePages()
    expanded.value = true
    for (const page of list) {
      const item = downloadStore.getItem(props.video.bvid, page.cid)
      if (['success', 'downloading', 'waiting', 'preprocess', 'importing', 'writing'].includes(item.status)) {
        continue
      }
      startDownloadVideo({
        bvid: props.video.bvid,
        cid: page.cid,
        page: page.page,
        pages: list.length,
        part: page.part,
        title: props.video.title,
        uname: props.video.upper.name,
        folderName: props.folderName,
        coverUrl: props.video.cover
      })
      item.status = 'waiting'
    }
  } catch (error) {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: error instanceof Error ? error.message : String(error)
    })
  }
}

onMounted(() => {
  if (histories.value.length === 0) return
  void ensurePages()
    .then(list => {
      if (list.length > 1 && histories.value.length > 1) expanded.value = true
    })
    .catch(() => undefined)
})
</script>
