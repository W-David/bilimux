<template>
  <div class="card-border rounded-2xl p-3">
    <div class="relative flex items-center justify-between gap-3">
      <div class="relative h-18 w-28 shrink-0 overflow-hidden rounded-lg bg-gray-900 shadow shadow-black/20">
        <img
          v-if="row.video.cover"
          :src="safeCover(row.video.cover)"
          referrerpolicy="no-referrer"
          class="h-full w-full object-cover"
          alt="" />
        <div
          v-else
          class="h-full w-full flex items-center justify-center text-xl text-gray-600">
          <TvIcon class="size-6" />
        </div>
        <span
          v-if="showPartBadge"
          class="absolute top-1 right-1 rounded-sm bg-black/60 px-1 py-0.5 text-[10px] text-gray-50">
          P{{ row.page.page }}
        </span>
      </div>

      <div class="min-w-0 flex-1 flex flex-col justify-between gap-2">
        <div class="mb-4 flex items-center">
          <div class="truncate text-sm text-[#f6f6f6] font-medium">{{ row.video.title }}</div>
        </div>
        <div class="flex items-center justify-between">
          <div class="min-w-0 flex items-center gap-1 text-xs text-gray-400">
            <span
              v-if="row.video.upper.name"
              class="h-4 w-6 flex shrink-0 items-center justify-center rounded-sm bg-pink-400/20 text-[9px] text-pink-400 font-bold leading-none">
              UP
            </span>
            <span
              v-if="row.video.upper.name"
              class="truncate">
              {{ row.video.upper.name }}
            </span>
            <span
              v-if="partLabel"
              class="min-w-0 truncate">
              {{ row.video.upper.name ? '· ' : '' }}{{ partLabel }}
            </span>
          </div>
        </div>
      </div>

      <div class="absolute right-0 bottom-0">
        <DownloadStatus
          v-if="mode === 'active'"
          :video="row.video"
          :page="row.page"
          :pages-total="row.pagesTotal"
          :folder-name="row.folderName"
          :history="row.history" />
        <div
          v-else
          class="flex items-center gap-1 rounded-full border border-white/5 bg-white/6 py-1.5 px-2 shadow-inner shadow-black/20 backdrop-blur-md">
          <DeleteTaskDialog
            title="删除下载任务？"
            description="默认只移除该分P记录。勾选后才会删除下载的视频文件。"
            file-option-label="同时删除视频文件"
            @confirm="handleDelete">
            <button
              type="button"
              aria-label="删除任务"
              class="flex size-6 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/10">
              <Trash2Icon class="size-4 text-red-400 transition-colors hover:text-red-300" />
            </button>
          </DeleteTaskDialog>

          <button
            type="button"
            aria-label="打开文件所在位置"
            :disabled="!outputTarget"
            class="flex size-6 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            @click="openFileLocation">
            <FolderOpenIcon class="size-4 text-gray-300 transition-colors hover:text-white" />
          </button>

          <button
            type="button"
            aria-label="文件详情"
            class="flex size-6 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/10"
            @click="detailsOpen = true">
            <InfoIcon class="size-4 text-gray-300 transition-colors hover:text-white" />
          </button>

          <button
            v-if="isPlayable"
            type="button"
            aria-label="打开文件"
            class="flex size-6 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/10"
            @click="openTaskFile">
            <CirclePlayIcon class="size-4 text-gray-400 transition-colors hover:text-green-400" />
          </button>
          <div
            v-else
            class="size-6 rounded-full shrink-0 flex items-center justify-center bg-red-500/10 text-red-400 ring-1 ring-red-500/20">
            <CircleAlertIcon class="size-3" />
          </div>
        </div>
      </div>
    </div>

    <DownloadFileDetailsDrawer
      :row="row"
      :open="detailsOpen"
      @close="detailsOpen = false" />
  </div>
</template>

<script setup lang="ts">
import {
  CircleAlert as CircleAlertIcon,
  CirclePlay as CirclePlayIcon,
  FolderOpen as FolderOpenIcon,
  Info as InfoIcon,
  Trash2 as Trash2Icon,
  Tv as TvIcon
} from '@lucide/vue'
import { openFolder, openPath } from '@renderer/api'
import DownloadFileDetailsDrawer from '@renderer/components/DownloadFileDetailsDrawer.vue'
import DownloadStatus from '@renderer/components/DownloadStatus.vue'
import { mittbus } from '@renderer/ipc'
import { useDownloadStore, type DownloadTaskRow } from '@renderer/store/download'
import { safeCover } from '@renderer/utils/media'
import { computed, ref } from 'vue'

const props = defineProps<{
  row: DownloadTaskRow
  mode: 'active' | 'complete'
}>()

const downloadStore = useDownloadStore()
const detailsOpen = ref(false)
const item = computed(() => downloadStore.getItem(props.row.video.bvid, props.row.page.cid))

const showPartBadge = computed(() => props.row.pagesTotal > 1 || props.row.page.page > 1)
const partLabel = computed(() => {
  if (!showPartBadge.value && !props.row.page.part) return ''
  const name = props.row.page.part?.trim()
  return name ? `P${props.row.page.page} ${name}` : `P${props.row.page.page}`
})

const outputTarget = computed(() => item.value.outputPath || props.row.history?.outputPath || '')
const isPlayable = computed(
  () =>
    item.value.status === 'success' ||
    Boolean(props.row.history?.status === 'completed' && props.row.history.fileExists && outputTarget.value)
)

const handleDelete = async (deleteFile: boolean): Promise<void> => {
  await downloadStore.removeItem(props.row, deleteFile)
}

const openFileLocation = async (): Promise<void> => {
  if (!outputTarget.value) {
    mittbus.emit('toast:add', {
      severity: 'warn',
      message: '文件路径不存在'
    })
    return
  }
  try {
    await openFolder(outputTarget.value)
  } catch (error) {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: error instanceof Error ? error.message : String(error)
    })
  }
}

const openTaskFile = async (): Promise<void> => {
  if (!outputTarget.value) {
    mittbus.emit('toast:add', {
      severity: 'warn',
      message: '文件路径不存在'
    })
    return
  }
  const errMessage = await openPath(outputTarget.value)
  if (errMessage) {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: errMessage
    })
  }
}
</script>
