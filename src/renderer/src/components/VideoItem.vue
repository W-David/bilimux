<template>
  <div
    ref="rootRef"
    class="card-border rounded-2xl p-3">
    <div class="relative flex items-center justify-between gap-3">
      <div class="relative h-18 w-28 shrink-0 overflow-hidden rounded-lg bg-gray-900 shadow shadow-black/20">
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
        <!-- 多选勾选：先隐藏
        <div
          v-if="selectable"
          class="absolute top-1 left-1 rounded bg-black/80 shadow-sm shadow-black/20">
          <button
            type="button"
            class="flex size-5 shrink-0 items-center justify-center rounded border border-white/20 text-[10px] text-pink-400"
            :class="selected ? 'bg-pink-400/30' : partialSelected ? 'bg-pink-400/15' : 'bg-transparent'"
            :disabled="video.attr !== 0"
            :aria-checked="selected ? 'true' : partialSelected ? 'mixed' : 'false'"
            role="checkbox"
            @click.stop="onToggleVideo">
            <span v-if="selected">✓</span>
            <span v-else-if="partialSelected">–</span>
          </button>
        </div>
        -->
        <span class="absolute bottom-1 right-1 rounded-sm bg-black/60 px-1 py-0.5 text-[10px] text-[#f6f6f6]">
          {{ formatDuration(video.duration) }}
        </span>
        <span
          v-if="isMultiPage"
          class="absolute top-1 right-1 rounded-sm bg-black/60 px-1 py-0.5 text-[10px] text-gray-50">
          {{ resolvedPageCount }}P
        </span>
      </div>

      <div class="min-w-0 flex-1 flex flex-col justify-between gap-2">
        <div class="mb-4 flex items-center">
          <div class="truncate text-sm text-[#f6f6f6] font-medium">{{ video.title }}</div>
        </div>
        <div class="flex items-center justify-between">
          <div class="min-w-0 flex items-center gap-1 text-xs text-gray-400">
            <span
              class="h-4 w-6 flex shrink-0 items-center justify-center rounded-sm bg-pink-400/20 text-[9px] text-pink-400 font-bold leading-none">
              UP
            </span>
            <span class="truncate">{{ video.upper.name }}</span>
            <!--
            <span
              v-if="review && selectedSummary"
              class="shrink-0 text-[10px] text-pink-400/80">
              · {{ selectedSummary }}
            </span>
            -->
          </div>
        </div>
      </div>

      <div class="absolute right-0 bottom-0">
        <template v-if="video.attr !== 0">
          <div class="flex h-8 w-20 items-center justify-center rounded-full bg-gray-600/20 text-xs text-gray-200">
            已失效
          </div>
        </template>
        <!-- 多选确认卡
        <DownloadStatus
          v-else-if="reviewSinglePage"
          :video="video"
          :page="reviewSinglePage"
          :pages-total="resolvedPageCount"
          :folder-name="folderName"
          :history="historyFor(reviewSinglePage.cid)"></DownloadStatus>
        <Spinner
          v-else-if="review && pagesLoading"
          class="size-4 text-pink-400" />
        -->
        <button
          v-else-if="isMultiPage"
          type="button"
          :disabled="pagesLoading"
          class="relative h-8 min-w-20 flex cursor-pointer select-none items-center justify-center gap-1 overflow-hidden rounded-full px-2 text-xs text-pink-400 transition-all duration-200 card-glassy hover:ring-1 hover:ring-pink-400/20 disabled:opacity-60"
          @click.stop="toggleAccordion">
          <ChevronUpIcon
            v-if="expanded"
            class="size-4" />
          <ChevronDownIcon
            v-else
            class="size-4" />
          <span>{{ expanded ? '收起' : '展开' }}</span>
        </button>
        <DownloadStatus
          v-else-if="singlePage"
          :video="video"
          :page="singlePage"
          :pages-total="1"
          :folder-name="folderName"
          :history="historyFor(singlePage.cid)"></DownloadStatus>
        <button
          v-else-if="!pendingOnly && legacyPlayable"
          type="button"
          class="relative h-8 min-w-20 flex cursor-pointer select-none items-center justify-center overflow-hidden rounded-full px-2 text-xs text-green-400 transition-all duration-200 card-glassy hover:ring-1 hover:ring-green-400/20"
          @click.stop="playLegacy">
          播放
        </button>
        <button
          v-else
          type="button"
          class="relative h-8 min-w-20 flex cursor-pointer select-none items-center justify-center overflow-hidden rounded-full px-2 text-xs text-pink-400 transition-all duration-200 card-glassy hover:ring-1 hover:ring-pink-400/20 disabled:opacity-60"
          :disabled="pagesLoading"
          @click.stop="onSingleDownload">
          <Spinner
            v-if="pagesLoading"
            class="size-4" />
          <span v-else>下载</span>
        </button>
      </div>
    </div>

    <!-- 多选确认卡分 P
    <div
      v-if="review && reviewPages.length > 1"
      class="mt-3 flex flex-col gap-2 border-t border-white/5 pt-3">
      ...
    </div>
    -->

    <div
      v-if="!review && expanded"
      class="mt-3 flex flex-col gap-2 border-t border-white/5 pt-3">
      <!-- 多选分 P 勾选
      <div
        v-if="selectable"
        class="flex items-center justify-between gap-2">
        <span class="text-xs text-gray-500">{{ resolvedPageCount }}P</span>
      </div>
      -->

      <div
        v-if="!visiblePages?.length"
        class="py-2 text-center text-xs text-gray-500">
        {{ pagesLoading ? '正在获取分P…' : '尚未获取分P列表' }}
      </div>
      <div
        v-else
        class="flex flex-col gap-2">
        <div class="flex min-w-0 items-center justify-between gap-3">
          <span class="min-w-0 flex-1 truncate text-xs text-gray-400">全部 {{ visiblePages.length }}P</span>
          <button
            type="button"
            class="relative h-8 min-w-20 flex cursor-pointer select-none items-center justify-center overflow-hidden rounded-full px-2 text-xs text-pink-400 transition-all duration-200 card-glassy hover:ring-1 hover:ring-pink-400/20"
            @click.stop="downloadAllParts">
            全部下载
          </button>
        </div>
        <div
          v-for="page in visiblePages"
          :key="page.cid"
          class="flex min-w-0 items-center justify-between gap-3">
          <span class="min-w-0 flex-1 truncate text-xs text-gray-400">P{{ page.page }} {{ page.part }}</span>
          <DownloadStatus
            :video="video"
            :page="page"
            :pages-total="resolvedPageCount"
            :folder-name="folderName"
            :history="historyFor(page.cid)"></DownloadStatus>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronDown as ChevronDownIcon, ChevronUp as ChevronUpIcon, Tv as TvIcon } from '@lucide/vue'
import { openPath } from '@renderer/api'
import DownloadStatus from '@renderer/components/DownloadStatus.vue'
import { mittbus } from '@renderer/ipc'
import { useDownloadStore } from '@renderer/store/download'
import { formatDuration, safeCover } from '@renderer/utils/media'
import type { BiliVideoPage, DownloadHistoryRecord, FavoriteResource } from '@shared/types'
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    video: FavoriteResource
    folderName: string
    folderId?: number
    histories?: DownloadHistoryRecord[]
    review?: boolean
    pendingOnly?: boolean
  }>(),
  {
    folderId: 0,
    histories: undefined,
    review: false,
    pendingOnly: false
  }
)

const emit = defineEmits<{
  (e: 'resize', height: number): void
}>()

const downloadStore = useDownloadStore()
const { pagesByBvid, pagesLoading: pagesLoadingMap, expandedBvid } = storeToRefs(downloadStore)

const rootRef = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

const pages = computed(() => pagesByBvid.value[props.video.bvid] ?? null)
const visiblePages = computed(() => {
  const list = pages.value
  if (!list) return null
  if (!props.pendingOnly) return list
  return downloadStore.pendingPagesFor(props.video.bvid, list)
})
const pagesLoading = computed(() => Boolean(pagesLoadingMap.value[props.video.bvid]))
const expanded = computed(() => !props.review && expandedBvid.value === props.video.bvid)

const favoritePageCount = computed(() => {
  const count = Number(props.video.page)
  return Number.isFinite(count) && count > 1 ? Math.trunc(count) : 1
})
const resolvedPageCount = computed(() => pages.value?.length ?? favoritePageCount.value)
const histories = computed(() => props.histories ?? [])
const historySuggestsMulti = computed(() => {
  const cids = new Set(histories.value.map(item => item.cid).filter(cid => cid !== 0))
  return cids.size > 1 || histories.value.some(item => item.page > 1)
})
const isMultiPage = computed(() => {
  if (props.pendingOnly) {
    if (visiblePages.value) return visiblePages.value.length > 1
    return favoritePageCount.value > 1
  }
  return resolvedPageCount.value > 1 || historySuggestsMulti.value
})
const singlePage = computed<BiliVideoPage | null>(() => {
  if (visiblePages.value?.length === 1) return visiblePages.value[0]
  return pages.value?.length === 1 ? pages.value[0] : null
})

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

const legacyPlayable = computed(() => Boolean(legacyCompleted.value) && !isMultiPage.value)

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

const toastError = (error: unknown): void => {
  mittbus.emit('toast:add', {
    severity: 'error',
    message: error instanceof Error ? error.message : String(error)
  })
}

const ensurePages = async (): Promise<BiliVideoPage[]> => {
  return downloadStore.loadPages(props.video.bvid)
}

const resolveVisiblePages = (list: BiliVideoPage[]): BiliVideoPage[] => {
  if (!props.pendingOnly) return list
  return downloadStore.pendingPagesFor(props.video.bvid, list)
}

const downloadAllParts = (): void => {
  const pending = visiblePages.value
  if (!pending?.length) return
  const total = pages.value?.length || resolvedPageCount.value
  for (const page of pending) {
    downloadStore.enqueuePart(props.video, props.folderName, page, total)
  }
}

const onSingleDownload = async (): Promise<void> => {
  try {
    const list = await ensurePages()
    const pending = resolveVisiblePages(list)
    if (pending.length > 1) {
      downloadStore.setExpanded(props.video.bvid)
      return
    }
    const page = pending[0]
    if (!page) return
    downloadStore.enqueuePart(props.video, props.folderName, page, list.length)
  } catch (error) {
    toastError(error)
  }
}

const toggleAccordion = async (): Promise<void> => {
  if (expanded.value) {
    downloadStore.setExpanded(null)
    return
  }
  downloadStore.setExpanded(props.video.bvid)
  try {
    const list = await ensurePages()
    if (resolveVisiblePages(list).length <= 1) {
      downloadStore.setExpanded(null)
    }
  } catch (error) {
    downloadStore.setExpanded(null)
    toastError(error)
  }
}

const reportHeight = (): void => {
  const height = rootRef.value?.offsetHeight
  if (height) emit('resize', height)
}

onMounted(() => {
  if (props.review) {
    void ensurePages().catch(toastError)
  }
  if (props.review || typeof ResizeObserver === 'undefined' || !rootRef.value) {
    reportHeight()
    return
  }
  resizeObserver = new ResizeObserver(() => reportHeight())
  resizeObserver.observe(rootRef.value)
  reportHeight()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

watch([expanded, pages, visiblePages, pagesLoading], () => reportHeight())
</script>
