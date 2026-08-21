<template>
  <div
    v-if="!ready"
    class="flex h-full min-h-0 flex-col">
    <div class="preview-scroll">
      <Skeleton class="aspect-video w-full shrink-0 rounded-xl" />
      <Skeleton class="mt-3 h-6 w-4/5" />
      <Skeleton class="mt-3 h-4 w-28" />
      <div class="mt-3 p-2 border-t border-[#252525]">
        <div class="leading-8 text-sm font-bold text-left">简介</div>
        <div class="flex flex-col gap-2 py-2">
          <Skeleton class="h-4 w-full" />
          <Skeleton class="h-4 w-11/12" />
          <Skeleton class="h-4 w-2/3" />
        </div>
      </div>
      <div class="mt-1.5 p-2 border-t border-[#252525]">
        <div class="leading-8 text-sm font-bold text-left">分集</div>
        <div class="flex flex-col gap-2">
          <div class="h-8 flex items-center justify-between">
            <Skeleton class="h-4 w-36" />
            <Skeleton class="h-4 w-16" />
          </div>
          <Skeleton
            v-for="n in 4"
            :key="n"
            class="h-8 w-full rounded-md" />
        </div>
      </div>
    </div>
    <div class="h-14 shrink-0 flex items-center px-4 border-t border-[#1f1f1f]">
      <Skeleton class="h-7 w-30 rounded-lg" />
      <Skeleton class="ml-auto h-[26px] w-20 rounded-full" />
    </div>
  </div>
  <div
    v-else
    class="flex h-full min-h-0 flex-col">
    <div class="preview-scroll">
      <div class="relative overflow-hidden rounded-xl bg-black">
        <img
          v-if="cover"
          :src="safeCover(cover)"
          referrerpolicy="no-referrer"
          class="block h-auto w-full"
          alt="" />
      </div>
      <h2 class="mt-3 text-base text-[#f6f6f6] font-medium leading-6">{{ title }}</h2>
      <div
        v-if="isSeason"
        class="mt-2 text-xs text-gray-500">
        {{ seasonSubtitle }}
      </div>
      <div
        v-else
        class="ml-1 mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-400">
        <span
          v-if="upName"
          class="inline-flex items-center gap-1">
          <span
            class="h-4 w-6 flex items-center justify-center rounded-sm bg-pink-400/20 text-[9px] text-pink-400 font-bold">
            UP
          </span>
          {{ upName }}
        </span>
        <span v-if="dateText">{{ dateText }}</span>
      </div>

      <div class="mt-3 p-2 border-t border-[#252525]">
        <div class="leading-8 text-sm font-bold text-left">简介</div>
        <div
          v-if="introLoading"
          class="flex flex-col gap-2 py-2">
          <Skeleton class="h-4 w-full" />
          <Skeleton class="h-4 w-11/12" />
          <Skeleton class="h-4 w-2/3" />
        </div>
        <div v-else>
          <p
            v-if="intro"
            class="whitespace-pre-wrap text-xs text-zinc-400 leading-6">
            {{ intro }}
          </p>
          <p
            v-else
            class="text-xs text-gray-600">
            暂无简介
          </p>
        </div>
      </div>

      <div
        v-if="showEpisodes"
        class="mt-1.5 p-2 border-t border-[#252525]">
        <div class="leading-8 text-sm font-bold text-left">分集</div>
        <div
          v-if="episodesLoading"
          class="flex flex-col gap-2">
          <div class="h-8 flex items-center justify-between">
            <Skeleton class="h-4 w-36" />
            <Skeleton class="h-4 w-16" />
          </div>
          <Skeleton
            v-for="n in episodeSkeletonCount"
            :key="n"
            class="h-8 w-full rounded-md" />
        </div>
        <div
          v-else
          class="flex flex-col gap-2">
          <div class="h-8 flex items-center justify-between gap-2">
            <div class="min-w-0 flex items-center gap-1.5 text-xs text-gray-400">
              <component
                :is="episodeStatusIcon"
                class="size-3.5 shrink-0"
                :class="fullyDownloaded ? 'text-green-400' : hasActiveDownload ? 'text-pink-400' : 'text-gray-500'" />
              <span class="truncate">{{ episodeSummary }}</span>
            </div>
            <button
              v-if="showSelectAll"
              type="button"
              class="shrink-0 text-xs text-pink-400"
              @click="toggleAll">
              {{ allSelectableChecked ? '取消全选' : '全选未下载' }}
            </button>
          </div>
          <div
            v-for="row in episodeRows"
            :key="row.key"
            class="flex w-full items-center h-8 gap-2 rounded-md border px-2 text-xs transition-colors"
            :class="episodeRowClass(row)"
            @click="onEpisodeRowClick(row)">
            <span
              class="min-w-0 flex-1 truncate"
              :class="row.checked ? 'text-[#f6f6f6]' : 'text-gray-300'">
              {{ row.label }}
            </span>
            <span
              v-show="row.active"
              class="flex shrink-0 items-center justify-center"
              aria-label="下载中">
              <Loader class="animate-pulse size-4 text-gray-400"></Loader>
            </span>
            <button
              v-show="row.downloaded"
              type="button"
              class="group flex shrink-0 items-center justify-center"
              aria-label="播放"
              @click.stop="playEpisode(row.key)">
              <CirclePlayIcon
                class="size-4 text-gray-400 transition-all duration-200 group-hover:scale-110 group-hover:text-green-400" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="h-14 shrink-0 flex items-center px-4 border-t border-[#1f1f1f]">
      <div
        v-if="invalid"
        class="text-xs text-gray-400">
        该视频已失效，无法下载
      </div>
      <div
        v-else
        class="flex w-full items-center gap-2">
        <Skeleton
          v-if="showFooterDownload && qualitiesLoading"
          class="h-7 w-30 shrink-0 rounded-lg" />
        <Select
          v-else-if="showFooterDownload"
          :model-value="qnValue"
          :disabled="qualityDisabled"
          @update:model-value="onQnChange">
          <SelectTrigger
            size="sm"
            class="w-30 shrink-0 [&_svg]:rotate-180"
            aria-label="清晰度">
            <SelectValue placeholder="清晰度" />
          </SelectTrigger>
          <SelectContent
            side="top"
            position="popper"
            align="start"
            :side-offset="6">
            <SelectGroup>
              <SelectItem
                v-for="option in qnOptions"
                :key="option.qn"
                :value="String(option.qn)">
                {{ option.label }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <div class="ml-auto flex items-center gap-2">
          <Skeleton
            v-if="showFooterDownload && pagesLoading"
            class="h-6.5 w-20 shrink-0 rounded-full" />
          <ProgressCapsule
            v-else-if="showFooterDownload"
            size="sm"
            :label="downloadLabel"
            :disabled="downloadDisabled"
            :icon="DownloadIcon"
            :aria-label="downloadLabel"
            @click="downloadSelected" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CircleCheck as CircleCheckIcon,
  CirclePlay as CirclePlayIcon,
  Download as DownloadIcon,
  Loader
} from '@lucide/vue'
import ProgressCapsule from '@renderer/components/ProgressCapsule.vue'
import { mittbus } from '@renderer/ipc'
import { openLocalPath } from '@renderer/utils/open-file'
import { fetchVideoDetail } from '@renderer/services/library'
import { useDownloadStore } from '@renderer/store/download'
import { usePreferenceStore } from '@renderer/store/preference'
import { formatDate, safeCover } from '@renderer/utils/media'
import {
  clampDownloadQn,
  DOWNLOAD_QN_OPTIONS,
  DOWNLOAD_QN_VALUES,
  pickPreferredDownloadQn,
  type DownloadQn
} from '@shared/download'
import type { BangumiFollowItem, BiliVideoPage, CollectionMedia } from '@shared/types'
import { computed, ref, watch } from 'vue'

type EpisodeRow = {
  key: string
  label: string
  checked: boolean
  disabled: boolean
  active: boolean
  downloaded: boolean
}

const props = withDefaults(
  defineProps<{
    payload?: CollectionMedia | null
    season?: BangumiFollowItem | null
    items?: CollectionMedia[]
    loading?: boolean
    evaluate?: string
  }>(),
  {
    payload: null,
    season: null,
    items: () => [],
    loading: false,
    evaluate: ''
  }
)

const downloadStore = useDownloadStore()
const preferenceStore = usePreferenceStore()
const detailLoading = ref(false)
const introOverride = ref('')
const ownerOverride = ref('')
const dateOverride = ref(0)
const selectedCids = ref<number[]>([])
const selectedKeys = ref<string[]>([])
const selectedQn = ref<DownloadQn>(clampDownloadQn(preferenceStore.preference['download-config'].qn))
const availableQns = ref<DownloadQn[]>([])
const qualitiesLoading = ref(false)
let loadSeq = 0

const isSeason = computed(() => Boolean(props.season))
const ready = computed(() => Boolean(props.payload || props.season))
const video = computed(() => props.payload?.video ?? null)
const cover = computed(() => (isSeason.value ? props.season?.cover : video.value?.cover) || '')
const title = computed(() => (isSeason.value ? props.season?.title : video.value?.title) || '')
const upName = computed(() => ownerOverride.value || video.value?.upper.name || '')
const intro = computed(() => {
  if (isSeason.value) return props.evaluate || props.items[0]?.video.intro || ''
  return introOverride.value || video.value?.intro || ''
})
const dateText = computed(() => formatDate(dateOverride.value || video.value?.pubtime || video.value?.ctime))
const seasonSubtitle = computed(() => {
  if (!props.season) return ''
  return [props.season.newEpIndexShow, props.season.progress].filter(Boolean).join(' · ')
})
const pages = computed<BiliVideoPage[]>(() => {
  if (!video.value) return []
  return downloadStore.pagesByBvid[video.value.bvid] ?? []
})
const pagesLoading = computed(() => {
  if (!video.value) return false
  return Boolean(downloadStore.pagesLoading[video.value.bvid])
})
const invalid = computed(() => Boolean(video.value && video.value.attr !== 0))
const isMultiPart = computed(() => {
  if (isSeason.value) return props.items.length > 1
  if (pages.value.length > 1) return true
  return (Number(video.value?.page) || 0) > 1
})
const showEpisodes = computed(() => isSeason.value || Boolean(video.value))
const introLoading = computed(() => (isSeason.value ? props.loading : detailLoading.value))
const episodesLoading = computed(() => (isSeason.value ? props.loading : pagesLoading.value))
const episodeSkeletonCount = computed(() => {
  if (isSeason.value) return 6
  const count = Number(video.value?.page) || 1
  return Math.min(8, Math.max(1, count))
})
const qnValue = computed(() => (availableQns.value.includes(selectedQn.value) ? String(selectedQn.value) : undefined))
const qnOptions = computed(() => {
  if (!availableQns.value.length) return []
  const allowed = new Set(availableQns.value)
  return DOWNLOAD_QN_OPTIONS.filter(option => allowed.has(option.qn))
})
const preferredQn = computed(() => clampDownloadQn(preferenceStore.preference['download-config'].qn))
const downloadLabel = computed(() => (isMultiPart.value ? '下载所选' : '下载'))

const isOgvActive = (item: CollectionMedia): boolean => {
  if (!item.cid) return false
  return downloadStore.isCidActive(item.video.bvid, item.cid)
}

const isPartDownloaded = (bvid: string, cid: number): boolean => {
  const state = downloadStore.getItem(bvid, cid)
  return state.status === 'success' && Boolean(state.outputPath)
}

const playPathOf = (item: CollectionMedia): string => {
  if (!item.cid) return ''
  return downloadStore.getItem(item.video.bvid, item.cid).outputPath
}

const episodeRows = computed<EpisodeRow[]>(() => {
  if (isSeason.value) {
    return props.items.map(item => {
      const active = isOgvActive(item)
      const downloaded = Boolean(item.cid && isPartDownloaded(item.video.bvid, item.cid))
      return {
        key: item.key,
        label: item.video.title,
        checked: !active && !downloaded && selectedKeys.value.includes(item.key),
        disabled: active || downloaded,
        active,
        downloaded
      }
    })
  }
  if (!video.value) return []
  return pages.value.map(page => {
    const active = downloadStore.isCidActive(video.value!.bvid, page.cid)
    const downloaded = isPartDownloaded(video.value!.bvid, page.cid)
    return {
      key: String(page.cid),
      label: `P${page.page} ${page.part}`,
      checked: !active && !downloaded && selectedCids.value.includes(page.cid),
      disabled: active || downloaded,
      active,
      downloaded
    }
  })
})

const episodeUnit = computed(() => (isSeason.value ? '话' : 'P'))

const episodeTotal = computed(() => {
  if (isSeason.value) return props.items.length
  return pages.value.length
})

const downloadedCount = computed(() => episodeRows.value.filter(row => row.downloaded).length)

const episodeSummary = computed(
  () => `已下载 ${downloadedCount.value}${episodeUnit.value} / 共 ${episodeTotal.value}${episodeUnit.value}`
)

const episodeStatusIcon = computed(() => {
  if (fullyDownloaded.value) return CircleCheckIcon
  return DownloadIcon
})

const hasActiveDownload = computed(() => {
  if (isSeason.value) return props.items.some(item => isOgvActive(item))
  if (!video.value) return false
  return pages.value.some(page => downloadStore.isCidActive(video.value!.bvid, page.cid))
})

const showSelectAll = computed(() => {
  if (fullyDownloaded.value) return false
  if (episodeTotal.value <= 1) return false
  if (isSeason.value) return selectableSeasonItems.value.length > 0
  return selectableCids.value.length > 0
})

const selectableCids = computed(() => {
  if (!video.value) return []
  return pages.value
    .filter(
      page => !downloadStore.isCidActive(video.value!.bvid, page.cid) && !isPartDownloaded(video.value!.bvid, page.cid)
    )
    .map(page => page.cid)
})

const selectableSeasonItems = computed(() =>
  props.items.filter(item => !isOgvActive(item) && !(item.cid && isPartDownloaded(item.video.bvid, item.cid)))
)

const allSelectableChecked = computed(() => {
  if (isSeason.value) {
    return (
      selectableSeasonItems.value.length > 0 &&
      selectableSeasonItems.value.every(item => selectedKeys.value.includes(item.key))
    )
  }
  return selectableCids.value.length > 0 && selectableCids.value.every(cid => selectedCids.value.includes(cid))
})

const canEnqueue = computed(() => {
  if (isSeason.value) {
    return selectedKeys.value.some(key => selectableSeasonItems.value.some(item => item.key === key))
  }
  if (!video.value) return false
  return selectedCids.value.some(cid => selectableCids.value.includes(cid))
})

const downloadDisabled = computed(() => {
  if (qualitiesLoading.value) return true
  if (pagesLoading.value) return true
  return !canEnqueue.value
})

const qualityDisabled = computed(() => {
  if (qualitiesLoading.value) return true
  if (fullyDownloaded.value) return true
  return !canEnqueue.value
})

const showFooterDownload = computed(() => showEpisodes.value || !fullyDownloaded.value)

const fullyDownloaded = computed(() => {
  if (isSeason.value) {
    const list = props.items.filter(item => item.cid)
    return list.length > 0 && list.every(item => isPartDownloaded(item.video.bvid, item.cid!))
  }
  if (!video.value || !pages.value.length) return false
  return pages.value.every(page => isPartDownloaded(video.value!.bvid, page.cid))
})

const applyQualities = (qns: DownloadQn[]): void => {
  availableQns.value = qns.length ? qns : [...DOWNLOAD_QN_VALUES]
  selectedQn.value = pickPreferredDownloadQn(availableQns.value, preferredQn.value)
}

const loadQualitiesFor = async (
  seq: number,
  query: { bvid: string; cid: number; kind?: 'ugc' | 'ogv'; epId?: number }
): Promise<void> => {
  qualitiesLoading.value = true
  try {
    const qns = await downloadStore.loadQualities(query)
    if (seq !== loadSeq) return
    applyQualities(qns)
  } catch {
    if (seq !== loadSeq) return
    applyQualities([])
  } finally {
    if (seq === loadSeq) qualitiesLoading.value = false
  }
}

const onQnChange = (value: unknown): void => {
  const qn = clampDownloadQn(value)
  if (availableQns.value.length && !availableQns.value.includes(qn)) return
  selectedQn.value = qn
}

const episodeRowClass = (row: EpisodeRow): string => {
  if (row.disabled) return 'border-transparent bg-white/4'
  if (row.checked) return 'cursor-pointer border-pink-400 bg-pink-400/10'
  return 'cursor-pointer border-transparent hover:border-white/15 bg-white/4'
}

const onEpisodeRowClick = (row: EpisodeRow): void => {
  if (row.disabled) return
  toggleEpisode(row.key)
}

const toggleEpisode = (key: string): void => {
  const row = episodeRows.value.find(item => item.key === key)
  if (row?.disabled) return
  if (isSeason.value) {
    selectedKeys.value = selectedKeys.value.includes(key)
      ? selectedKeys.value.filter(item => item !== key)
      : [...selectedKeys.value, key]
    return
  }
  const cid = Number(key)
  if (!Number.isFinite(cid)) return
  selectedCids.value = selectedCids.value.includes(cid)
    ? selectedCids.value.filter(item => item !== cid)
    : [...selectedCids.value, cid]
}

const toggleAll = (): void => {
  if (isSeason.value) {
    selectedKeys.value = allSelectableChecked.value ? [] : selectableSeasonItems.value.map(item => item.key)
    return
  }
  selectedCids.value = allSelectableChecked.value ? [] : [...selectableCids.value]
}

const downloadSelected = (): void => {
  const qn = pickPreferredDownloadQn(availableQns.value, selectedQn.value)
  if (isSeason.value) {
    const targets = props.items.filter(
      item =>
        selectedKeys.value.includes(item.key) &&
        item.cid &&
        !isOgvActive(item) &&
        !isPartDownloaded(item.video.bvid, item.cid)
    )
    for (const item of targets) {
      downloadStore.enqueuePart(
        item.video,
        item.folderName,
        {
          cid: item.cid!,
          page: 1,
          part: item.video.title,
          duration: item.video.duration
        },
        1,
        { kind: 'ogv', epId: item.epId, qn }
      )
    }
    return
  }

  const current = props.payload
  if (!current) return
  const list = pages.value.length ? pages.value : []
  const targets = list.filter(
    page =>
      selectedCids.value.includes(page.cid) &&
      !downloadStore.isCidActive(current.video.bvid, page.cid) &&
      !isPartDownloaded(current.video.bvid, page.cid)
  )
  for (const page of targets) {
    downloadStore.enqueuePart(current.video, current.folderName, page, list.length || 1, { kind: 'ugc', qn })
  }
}

const openLocalFile = async (path: string): Promise<void> => {
  await openLocalPath(path)
}

const playEpisode = async (key: string): Promise<void> => {
  if (isSeason.value) {
    const item = props.items.find(entry => entry.key === key)
    await openLocalFile(item ? playPathOf(item) : '')
    return
  }
  if (!video.value) return
  const cid = Number(key)
  if (!Number.isFinite(cid)) return
  await openLocalFile(downloadStore.getItem(video.value.bvid, cid).outputPath)
}

watch(
  () => props.payload?.video.bvid ?? props.season?.seasonId ?? '',
  () => {
    availableQns.value = []
    qualitiesLoading.value = Boolean(props.payload || props.season)
  }
)

watch(
  () => props.payload,
  async payload => {
    const seq = ++loadSeq
    introOverride.value = ''
    ownerOverride.value = ''
    dateOverride.value = 0
    selectedCids.value = []
    if (!payload || payload.kind !== 'ugc') return

    try {
      const list = await downloadStore.loadPages(payload.video.bvid)
      if (seq !== loadSeq) return
      const cid = list[0]?.cid
      if (cid) {
        void loadQualitiesFor(seq, { bvid: payload.video.bvid, cid, kind: 'ugc' })
      } else {
        applyQualities([])
        qualitiesLoading.value = false
      }
    } catch (error) {
      if (seq !== loadSeq) return
      applyQualities([])
      qualitiesLoading.value = false
      mittbus.emit('toast:add', {
        severity: 'error',
        message: error instanceof Error ? error.message : String(error)
      })
    }
    detailLoading.value = true
    try {
      const detail = await fetchVideoDetail(payload.video.bvid)
      if (seq !== loadSeq) return
      introOverride.value = detail.desc
      ownerOverride.value = detail.owner.name || ownerOverride.value
      dateOverride.value = detail.pubdate
    } catch {
      // 收藏列表里的 intro 仍可兜底显示
    } finally {
      if (seq === loadSeq) detailLoading.value = false
    }
  }
)

watch(
  () => {
    const first = props.items.find(item => Number(item.cid) > 0)
    if (!props.season || !first?.cid) return ''
    return `${first.video.bvid}:${first.cid}:${first.epId ?? ''}`
  },
  key => {
    if (!key || !props.season) return
    const first = props.items.find(item => Number(item.cid) > 0)
    if (!first?.cid) return
    const seq = ++loadSeq
    void loadQualitiesFor(seq, {
      bvid: first.video.bvid,
      cid: first.cid,
      kind: 'ogv',
      epId: first.epId
    })
  }
)

watch(
  () => props.season?.seasonId,
  () => {
    selectedKeys.value = []
  }
)
</script>
