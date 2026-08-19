<template>
  <div
    v-if="!payload"
    class="flex h-full flex-col">
    <Skeleton class="aspect-video w-full shrink-0 rounded-xl" />
    <Separator class="my-2 bg-[#1f1f1f]" />
    <Skeleton class="h-6 w-4/5" />
    <Skeleton class="ml-1 mt-3 h-4 w-36" />
    <div class="mt-3 border-b border-t border-[#252525] px-2">
      <div class="flex items-center justify-between py-3">
        <Skeleton class="h-3.5 w-10" />
        <Skeleton class="size-3.5 rounded-full" />
      </div>
      <Skeleton class="mb-3 h-16 w-full rounded-sm" />
      <div class="flex items-center justify-between border-t border-[#252525] py-3">
        <Skeleton class="h-3.5 w-10" />
        <Skeleton class="size-3.5 rounded-full" />
      </div>
    </div>
    <div class="mt-auto pt-4">
      <Skeleton class="ml-auto h-8 w-20" />
    </div>
  </div>
  <div
    v-else
    class="flex h-full min-h-0 flex-col">
    <div class="min-h-0 flex-1 overflow-y-auto">
      <div class="group relative h-auto w-full overflow-hidden rounded-xl bg-black">
        <img
          v-if="cover"
          :src="safeCover(cover)"
          referrerpolicy="no-referrer"
          class="block h-auto w-full"
          alt="" />
        <div class="absolute inset-0 bg-black/20"></div>
      </div>

      <Separator class="my-2 bg-[#1f1f1f]" />

      <h2 class="text-base text-[#f6f6f6] font-medium leading-6">{{ title }}</h2>
      <div class="ml-1 mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-400">
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

      <Accordion
        :key="payload.video.bvid"
        type="single"
        collapsible
        default-value="intro"
        class="mt-3 px-2 border-b border-t border-[#252525]">
        <AccordionItem value="intro">
          <AccordionTrigger>
            <span class="font-bold">简介</span>
          </AccordionTrigger>
          <AccordionContent>
            <p
              v-if="detailLoading"
              class="text-xs text-gray-500">
              正在获取简介…
            </p>
            <p
              v-else-if="intro"
              class="whitespace-pre-wrap text-xs text-zinc-400 leading-6">
              {{ intro }}
            </p>
            <p
              v-else
              class="text-xs text-gray-600">
              暂无简介
            </p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem
          v-if="video && video.attr === 0 && payload.kind === 'ugc' && pages.length > 1"
          value="video-list">
          <AccordionTrigger>
            <span class="font-bold">分集</span>
          </AccordionTrigger>
          <AccordionContent>
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-500">共 {{ pages.length }} P / 已选 {{ selectedCids.length }} P</span>
                <button
                  type="button"
                  class="text-xs text-pink-400"
                  @click="toggleAll">
                  {{ allSelectableChecked ? '取消全选' : '全选' }}
                </button>
              </div>
              <div
                v-for="page in pages"
                :key="page.cid"
                class="flex items-center px-1 py-1.5 border-b border-[#1f1f1f] text-sm">
                <Checkbox
                  :model-value="isCidPicked(page.cid)"
                  :disabled="downloadStore.isCidActive(video.bvid, page.cid)"
                  @update:model-value="checked => toggleCid(page.cid, Boolean(checked))" />
                <span class="min-w-0 flex-1 truncate text-gray-300 ml-2">P{{ page.page }} {{ page.part }}</span>
                <Spinner
                  v-if="downloadStore.isCidActive(video.bvid, page.cid)"
                  class="size-4 text-pink-400" />
                <span
                  v-else-if="downloadStore.isCidCompleted(video.bvid, page.cid)"
                  class="text-xs text-green-400">
                  已完成
                </span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>

    <div class="shrink-0 pt-4">
      <div
        v-if="video && video.attr !== 0"
        class="rounded-lg bg-white/5 px-3 py-2 text-xs text-gray-400">
        该视频已失效，无法下载
      </div>
      <div
        v-else-if="payload.kind === 'ogv'"
        class="flex items-center justify-end gap-2">
        <Spinner
          v-if="ogvActive"
          class="size-4 text-pink-400" />
        <span
          v-else-if="ogvCompleted"
          class="text-xs text-green-400">
          已下载完成
        </span>
        <Button
          size="sm"
          :disabled="ogvActive"
          @click="downloadOgv">
          下载
        </Button>
      </div>
      <div
        v-else
        class="flex items-center justify-end gap-2">
        <Spinner
          v-if="pagesLoading"
          class="size-4 text-pink-400" />
        <Button
          size="sm"
          :disabled="pagesLoading || !canEnqueue"
          @click="downloadSelected">
          下载
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CollectionMedia } from '@renderer/components/library/types'
import { mittbus } from '@renderer/ipc'
import { fetchVideoDetail } from '@renderer/services/library'
import { useDownloadStore } from '@renderer/store/download'
import { formatDate, safeCover } from '@renderer/utils/media'
import type { BiliVideoPage } from '@shared/types'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  payload: CollectionMedia | null
}>()

const downloadStore = useDownloadStore()
const detailLoading = ref(false)
const introOverride = ref('')
const ownerOverride = ref('')
const dateOverride = ref(0)
const selectedCids = ref<number[]>([])

const video = computed(() => props.payload?.video ?? null)
const cover = computed(() => video.value?.cover ?? '')
const title = computed(() => video.value?.title ?? '')
const upName = computed(() => ownerOverride.value || video.value?.upper.name || '')
const intro = computed(() => introOverride.value || video.value?.intro || '')
const dateText = computed(() => formatDate(dateOverride.value || video.value?.pubtime || video.value?.ctime))
const pages = computed<BiliVideoPage[]>(() => {
  if (!video.value) return []
  return downloadStore.pagesByBvid[video.value.bvid] ?? []
})
const pagesLoading = computed(() => {
  if (!video.value) return false
  return Boolean(downloadStore.pagesLoading[video.value.bvid])
})

const ogvCid = computed(() => props.payload?.cid ?? 0)
const ogvActive = computed(() => {
  if (!video.value || !ogvCid.value) return false
  return downloadStore.isCidActive(video.value.bvid, ogvCid.value)
})
const ogvCompleted = computed(() => {
  if (!video.value || !ogvCid.value) return false
  return downloadStore.isCidCompleted(video.value.bvid, ogvCid.value)
})

const selectableCids = computed(() =>
  pages.value.filter(page => !downloadStore.isCidActive(video.value!.bvid, page.cid)).map(page => page.cid)
)
const allSelectableChecked = computed(
  () => selectableCids.value.length > 0 && selectableCids.value.every(cid => selectedCids.value.includes(cid))
)
const canEnqueue = computed(() => {
  if (!video.value) return false
  if (pages.value.length <= 1) {
    const cid = pages.value[0]?.cid
    return Boolean(cid) && !downloadStore.isCidActive(video.value.bvid, cid)
  }
  return selectedCids.value.some(cid => !downloadStore.isCidActive(video.value!.bvid, cid))
})

const isCidPicked = (cid: number): boolean => selectedCids.value.includes(cid)

const toggleCid = (cid: number, checked: boolean): void => {
  if (checked) {
    if (!selectedCids.value.includes(cid)) selectedCids.value = [...selectedCids.value, cid]
    return
  }
  selectedCids.value = selectedCids.value.filter(item => item !== cid)
}

const toggleAll = (): void => {
  selectedCids.value = allSelectableChecked.value ? [] : [...selectableCids.value]
}

const downloadSelected = (): void => {
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
    downloadStore.enqueuePart(current.video, current.folderName, page, list.length || 1, { kind: 'ugc' })
  }
}

const downloadOgv = (): void => {
  const current = props.payload
  if (!current || !current.cid) return
  downloadStore.enqueuePart(
    current.video,
    current.folderName,
    {
      cid: current.cid,
      page: 1,
      part: current.video.title,
      duration: current.video.duration
    },
    1,
    { kind: 'ogv', epId: current.epId }
  )
}

let loadSeq = 0

watch(
  () => props.payload,
  async payload => {
    const seq = ++loadSeq
    introOverride.value = ''
    ownerOverride.value = ''
    dateOverride.value = 0
    selectedCids.value = []
    if (!payload) return

    if (payload.kind === 'ugc') {
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
  }
)
</script>
