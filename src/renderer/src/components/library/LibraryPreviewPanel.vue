<template>
  <div
    v-if="!ready"
    class="flex h-full flex-col">
    <Skeleton class="aspect-video w-full shrink-0 rounded-xl" />
    <Skeleton class="mt-3 h-6 w-4/5" />
    <Skeleton class="mt-3 h-4 w-36" />
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
          class="py-2 text-xs text-gray-600">
          正在获取简介
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
          class="py-2 text-xs text-gray-600">
          正在获取分集…
        </div>
        <div
          v-else
          class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-500">{{ episodeSummary }}</span>
            <button
              type="button"
              class="text-xs text-pink-400"
              @click="toggleAll">
              {{ allSelectableChecked ? '取消全选' : '全选' }}
            </button>
          </div>
          <div
            v-for="row in episodeRows"
            :key="row.key"
            class="flex items-center px-1 py-2 not-last:border-b border-[#1f1f1f] text-xs">
            <Checkbox
              :model-value="row.checked"
              :disabled="row.disabled"
              @update:model-value="checked => toggleEpisode(row.key, Boolean(checked))" />
            <span class="min-w-0 flex-1 truncate text-gray-300 ml-2">{{ row.label }}</span>
            <Spinner
              v-if="row.active"
              class="size-4 text-pink-400" />
            <span
              v-else-if="row.completed"
              class="text-xs text-green-400">
              已完成
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="shrink-0 pt-4 pr-4 border-t border-[#1f1f1f]">
      <div
        v-if="invalid"
        class="rounded-lg bg-white/5 px-3 py-2 text-xs text-gray-400">
        该视频已失效，无法下载
      </div>
      <div
        v-else
        class="flex items-center gap-2">
        <Select
          :model-value="qnValue"
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
                v-for="option in DOWNLOAD_QN_OPTIONS"
                :key="option.qn"
                :value="String(option.qn)">
                {{ option.label }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <div class="ml-auto flex items-center gap-2">
          <ProgressRing
            v-if="activeProgress !== null"
            compact
            :percent="activeProgress" />
          <Spinner
            v-else-if="pagesLoading"
            class="size-4 text-pink-400" />
          <Button
            v-if="playable"
            size="sm"
            variant="outline"
            @click="play">
            播放
          </Button>
          <Button
            size="sm"
            :disabled="downloadDisabled"
            @click="downloadSelected">
            {{ downloadLabel }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CollectionMedia } from '@renderer/components/library/types'
import ProgressRing from '@renderer/components/ProgressRing.vue'
import { emitter, mittbus } from '@renderer/ipc'
import { fetchVideoDetail } from '@renderer/services/library'
import { useDownloadStore } from '@renderer/store/download'
import { usePreferenceStore } from '@renderer/store/preference'
import { formatDate, safeCover } from '@renderer/utils/media'
import { clampDownloadQn, DOWNLOAD_QN_OPTIONS, type DownloadQn } from '@shared/download'
import type { BangumiFollowItem, BiliVideoPage } from '@shared/types'
import { computed, ref, watch } from 'vue'

type EpisodeRow = {
  key: string
  label: string
  checked: boolean
  disabled: boolean
  active: boolean
  completed: boolean
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
const showEpisodes = computed(() => isSeason.value || isMultiPart.value)
const introLoading = computed(() => (isSeason.value ? props.loading : detailLoading.value))
const episodesLoading = computed(() => (isSeason.value ? props.loading : pagesLoading.value))
const qnValue = computed(() => String(selectedQn.value))
const downloadLabel = computed(() => (isMultiPart.value ? '下载所选' : '下载'))

const isOgvActive = (item: CollectionMedia): boolean => {
  if (!item.cid) return false
  return downloadStore.isCidActive(item.video.bvid, item.cid)
}

const isOgvCompleted = (item: CollectionMedia): boolean => {
  if (!item.cid) return false
  return downloadStore.isCidCompleted(item.video.bvid, item.cid)
}

const playPathOf = (item: CollectionMedia): string => {
  if (!item.cid) return ''
  return downloadStore.getItem(item.video.bvid, item.cid).outputPath
}

const episodeRows = computed<EpisodeRow[]>(() => {
  if (isSeason.value) {
    return props.items.map(item => {
      const active = isOgvActive(item)
      const completed = isOgvCompleted(item)
      return {
        key: item.key,
        label: item.video.title,
        checked: selectedKeys.value.includes(item.key),
        disabled: active,
        active,
        completed
      }
    })
  }
  if (!video.value) return []
  return pages.value.map(page => {
    const active = downloadStore.isCidActive(video.value!.bvid, page.cid)
    const completed = downloadStore.isCidCompleted(video.value!.bvid, page.cid)
    return {
      key: String(page.cid),
      label: `P${page.page} ${page.part}`,
      checked: selectedCids.value.includes(page.cid),
      disabled: active,
      active,
      completed
    }
  })
})

const episodeSummary = computed(() => {
  if (isSeason.value) return `共 ${props.items.length} 话 / 已选 ${selectedKeys.value.length}`
  return `共 ${pages.value.length} P / 已选 ${selectedCids.value.length} P`
})

const selectableCids = computed(() => {
  if (!video.value) return []
  return pages.value.filter(page => !downloadStore.isCidActive(video.value!.bvid, page.cid)).map(page => page.cid)
})

const selectableSeasonItems = computed(() => props.items.filter(item => !isOgvActive(item) && !isOgvCompleted(item)))

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
  if (pages.value.length <= 1) {
    const cid = pages.value[0]?.cid
    return Boolean(cid) && !downloadStore.isCidActive(video.value.bvid, cid)
  }
  return selectedCids.value.some(cid => !downloadStore.isCidActive(video.value!.bvid, cid))
})

const downloadDisabled = computed(() => {
  if (isSeason.value) return !canEnqueue.value
  return pagesLoading.value || !canEnqueue.value
})

const activeProgress = computed(() => {
  if (isSeason.value) {
    const item = props.items.find(entry => isOgvActive(entry))
    if (!item?.cid) return null
    return downloadStore.getItem(item.video.bvid, item.cid).progress
  }
  if (!video.value) return null
  const page = pages.value.find(item => downloadStore.isCidActive(video.value!.bvid, item.cid))
  if (!page) return null
  return downloadStore.getItem(video.value.bvid, page.cid).progress
})

const playable = computed(() => {
  if (isSeason.value) return props.items.some(item => isOgvCompleted(item) && Boolean(playPathOf(item)))
  if (!video.value) return false
  return pages.value.some(page => {
    const state = downloadStore.getItem(video.value!.bvid, page.cid)
    return state.status === 'success' && Boolean(state.outputPath)
  })
})

const onQnChange = (value: unknown): void => {
  selectedQn.value = clampDownloadQn(value)
}

const toggleEpisode = (key: string, checked: boolean): void => {
  if (isSeason.value) {
    if (checked) {
      if (!selectedKeys.value.includes(key)) selectedKeys.value = [...selectedKeys.value, key]
      return
    }
    selectedKeys.value = selectedKeys.value.filter(item => item !== key)
    return
  }
  const cid = Number(key)
  if (!Number.isFinite(cid)) return
  if (checked) {
    if (!selectedCids.value.includes(cid)) selectedCids.value = [...selectedCids.value, cid]
    return
  }
  selectedCids.value = selectedCids.value.filter(item => item !== cid)
}

const toggleAll = (): void => {
  if (isSeason.value) {
    selectedKeys.value = allSelectableChecked.value ? [] : selectableSeasonItems.value.map(item => item.key)
    return
  }
  selectedCids.value = allSelectableChecked.value ? [] : [...selectableCids.value]
}

const downloadSelected = (): void => {
  const qn = selectedQn.value
  if (isSeason.value) {
    const targets = props.items.filter(
      item => selectedKeys.value.includes(item.key) && item.cid && !isOgvActive(item) && !isOgvCompleted(item)
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
  const targets =
    list.length <= 1
      ? list
      : list.filter(
          page => selectedCids.value.includes(page.cid) && !downloadStore.isCidActive(current.video.bvid, page.cid)
        )
  for (const page of targets) {
    downloadStore.enqueuePart(current.video, current.folderName, page, list.length || 1, { kind: 'ugc', qn })
  }
}

const play = async (): Promise<void> => {
  let path = ''
  if (isSeason.value) {
    const item = props.items.find(entry => isOgvCompleted(entry) && playPathOf(entry))
    path = item ? playPathOf(item) : ''
  } else if (video.value) {
    const page = pages.value.find(item => {
      const state = downloadStore.getItem(video.value!.bvid, item.cid)
      return state.status === 'success' && Boolean(state.outputPath)
    })
    path = page ? downloadStore.getItem(video.value.bvid, page.cid).outputPath : ''
  }
  if (!path) return
  const errMessage = await emitter.invoke('open-path', path)
  if (errMessage) {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: errMessage
    })
  }
}

let loadSeq = 0

watch(
  () => props.payload?.video.bvid ?? props.season?.seasonId ?? '',
  () => {
    selectedQn.value = clampDownloadQn(preferenceStore.preference['download-config'].qn)
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
      selectedCids.value = list
        .filter(
          page =>
            !downloadStore.isCidCompleted(payload.video.bvid, page.cid) &&
            !downloadStore.isCidActive(payload.video.bvid, page.cid)
        )
        .map(page => page.cid)
    } catch (error) {
      if (seq !== loadSeq) return
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
  () => props.items,
  list => {
    selectedKeys.value = list.filter(item => !isOgvActive(item) && !isOgvCompleted(item)).map(item => item.key)
  }
)
</script>
