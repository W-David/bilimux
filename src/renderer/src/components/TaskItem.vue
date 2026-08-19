<template>
  <div class="card-border relative rounded-2xl p-3">
    <div class="relative flex items-center justify-between gap-3 pr-16">
      <div class="relative h-18 w-28 shrink-0 overflow-hidden rounded-lg bg-gray-900 shadow shadow-black/20">
        <img
          v-if="cover"
          :src="safeCover(cover)"
          referrerpolicy="no-referrer"
          class="h-full w-full object-cover brightness-50"
          alt="" />
        <div
          v-else
          class="h-full w-full flex items-center justify-center text-xl text-gray-600">
          <TvIcon class="size-6" />
        </div>
        <span
          v-if="partBadge"
          class="absolute top-1 right-1 rounded-sm bg-black/60 px-1 py-0.5 text-[10px] text-gray-50">
          {{ partBadge }}
        </span>
        <div class="absolute top-[50%] left-[50%] translate-[-50%] h-6 w-24 flex justify-center items-center gap-2">
          <component
            :is="kindIcon"
            class="size-4 text-white" />
        </div>
      </div>

      <div class="min-w-0 flex-1 flex flex-col justify-between gap-2">
        <div class="mb-4 flex items-center">
          <div class="truncate text-sm text-[#f6f6f6] font-medium">{{ title }}</div>
        </div>
        <div class="min-w-0 flex items-center gap-1 text-xs text-gray-400">
          <span
            v-if="upName"
            class="h-4 w-6 flex shrink-0 items-center justify-center rounded-sm bg-pink-400/20 text-[9px] text-pink-400 font-bold leading-none">
            UP
          </span>
          <span
            v-if="upName"
            class="truncate">
            {{ upName }}
          </span>
          <span
            v-if="metaText"
            class="min-w-0 truncate">
            {{ upName ? `· ${metaText}` : metaText }}
          </span>
        </div>
      </div>

      <div class="absolute right-0 bottom-0 flex items-center gap-2">
        <template v-if="item.kind === 'download'">
          <ProgressRing
            v-if="lane === 'active' && downloadShowRing"
            compact
            :percent="downloadItem.progress" />
          <DownloadStatus
            v-if="lane === 'active'"
            :video="item.row.video"
            :page="item.row.page"
            :pages-total="item.row.pagesTotal"
            :folder-name="item.row.folderName"
            :history="item.row.history" />
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
        </template>
        <template v-else>
          <div
            v-if="lane === 'active'"
            class="size-9 shrink-0 flex items-center justify-center rounded-full"
            :class="convertBadgeClass">
            <component
              :is="convertStatusIcon"
              class="size-4" />
          </div>
          <div
            v-else
            class="flex items-center gap-1 rounded-full border border-white/5 bg-white/6 py-1.5 px-2 shadow-inner shadow-black/20 backdrop-blur-md">
            <DeleteTaskDialog
              title="删除转换任务？"
              description="默认只移除该任务记录。勾选后才会删除生成的视频文件。"
              file-option-label="同时删除视频文件"
              @confirm="handleDelete">
              <button
                type="button"
                aria-label="删除任务"
                :disabled="!canDeleteConvert"
                class="flex size-6 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent">
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
              class="size-6 rounded-full shrink-0 flex items-center justify-center"
              :class="convertBadgeClass">
              <component
                :is="convertStatusIcon"
                class="size-3" />
            </div>
          </div>
        </template>
      </div>
    </div>

    <DownloadFileDetailsDrawer
      v-if="item.kind === 'download'"
      :row="item.row"
      :open="detailsOpen"
      @close="detailsOpen = false" />
    <FileDetailsDrawer
      v-else
      :task="item.task"
      :open="detailsOpen"
      @close="detailsOpen = false" />
  </div>
</template>

<script setup lang="ts">
import {
  CircleAlert as CircleAlertIcon,
  CircleCheck as CircleCheckIcon,
  CirclePause as CirclePauseIcon,
  CirclePlay as CirclePlayIcon,
  Download as DownloadIcon,
  FileOutput as FileOutputIcon,
  FileQuestion as FileQuestionIcon,
  Film as FilmIcon,
  FolderOpen as FolderOpenIcon,
  Hourglass as HourglassIcon,
  Import as ImportIcon,
  Info as InfoIcon,
  PencilLine as PencilLineIcon,
  SkipForward as SkipForwardIcon,
  Trash2 as Trash2Icon,
  Tv as TvIcon
} from '@lucide/vue'
import { openFolder, openPath } from '@renderer/api'
import DownloadFileDetailsDrawer from '@renderer/components/DownloadFileDetailsDrawer.vue'
import DownloadStatus from '@renderer/components/DownloadStatus.vue'
import FileDetailsDrawer from '@renderer/components/FileDetailsDrawer.vue'
import ProgressRing from '@renderer/components/ProgressRing.vue'
import { mittbus } from '@renderer/ipc'
import type { UnifiedTask } from '@renderer/pages/tasks/unified'
import { useConvertStore } from '@renderer/store/convert'
import { useDownloadStore } from '@renderer/store/download'
import { safeCover } from '@renderer/utils/media'
import { computed, ref } from 'vue'

const props = defineProps<{
  item: UnifiedTask
  lane: 'active' | 'complete'
}>()

const downloadStore = useDownloadStore()
const convertStore = useConvertStore()
const detailsOpen = ref(false)

const kindIcon = computed(() => (props.item.kind === 'download' ? DownloadIcon : FilmIcon))

const cover = computed(() =>
  props.item.kind === 'download' ? props.item.row.video.cover : props.item.task.coverUrl || ''
)
const title = computed(() => (props.item.kind === 'download' ? props.item.row.video.title : props.item.task.title))
const upName = computed(() => {
  if (props.item.kind === 'download') return props.item.row.video.upper.name
  return props.item.task.uname || ''
})
const partBadge = computed(() => {
  if (props.item.kind !== 'download') return ''
  const row = props.item.row
  if (row.pagesTotal > 1 || row.page.page > 1) return `P${row.page.page}`
  return ''
})
const metaText = computed(() => {
  if (props.item.kind === 'download') {
    const row = props.item.row
    if (!(row.pagesTotal > 1 || row.page.page > 1) && !row.page.part) return ''
    const name = row.page.part?.trim()
    return name ? `P${row.page.page} ${name}` : `P${row.page.page}`
  }
  return props.item.task.bvid || ''
})

const downloadItem = computed(() => {
  if (props.item.kind !== 'download') {
    return { progress: 0, status: 'idle' as const, outputPath: '' }
  }
  return downloadStore.getItem(props.item.row.video.bvid, props.item.row.page.cid)
})
const downloadShowRing = computed(() => ['waiting', 'downloading', 'paused'].includes(downloadItem.value.status))

const outputTarget = computed(() => {
  if (props.item.kind === 'download') {
    return downloadItem.value.outputPath || props.item.row.history?.outputPath || ''
  }
  return props.item.task.outputPath || props.item.task.filePath || ''
})

const isPlayable = computed(() => {
  if (props.item.kind === 'download') {
    return (
      downloadItem.value.status === 'success' ||
      Boolean(props.item.row.history?.status === 'completed' && props.item.row.history.fileExists && outputTarget.value)
    )
  }
  return props.item.task.status === 'success' || props.item.task.status === 'skipped'
})

const canDeleteConvert = computed(() => {
  if (props.item.kind !== 'convert') return false
  return props.item.task.id.startsWith('history:') || Boolean(props.item.task.outputPath)
})

const convertBadgeClass = computed(() => {
  if (props.item.kind !== 'convert') return {}
  const status = props.item.task.status
  return {
    'bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20': status === 'importing' || status === 'writing',
    'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20': status === 'preprocess',
    'bg-green-500/10 text-green-400 ring-1 ring-green-500/20': status === 'success',
    'bg-red-500/10 text-red-400 ring-1 ring-red-500/20': status === 'fail',
    'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20': status === 'skipped',
    'bg-slate-500/10 text-slate-300 ring-1 ring-slate-500/20': status === 'interrupted',
    'bg-red-400/10 text-red-300 ring-1 ring-red-400/30': status === 'missing',
    'bg-gray-500/10 text-gray-400 ring-1 ring-gray-500/20': status === 'waiting' || status === 'scanned',
    'animate-pulse': status === 'preprocess' || status === 'importing' || status === 'writing'
  }
})

const convertStatusIcon = computed(() => {
  if (props.item.kind !== 'convert') return HourglassIcon
  switch (props.item.task.status) {
    case 'importing':
      return ImportIcon
    case 'writing':
      return FileOutputIcon
    case 'preprocess':
      return PencilLineIcon
    case 'success':
      return CircleCheckIcon
    case 'fail':
      return CircleAlertIcon
    case 'skipped':
      return SkipForwardIcon
    case 'interrupted':
      return CirclePauseIcon
    case 'missing':
      return FileQuestionIcon
    default:
      return HourglassIcon
  }
})

const handleDelete = async (deleteFile: boolean): Promise<void> => {
  if (props.item.kind === 'download') {
    await downloadStore.removeItem(props.item.row, deleteFile)
    return
  }
  await convertStore.removeItem(props.item.task, deleteFile)
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
