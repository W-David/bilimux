<template>
  <div class="card-border relative rounded-2xl p-3">
    <div class="relative flex items-center justify-between gap-3 pr-16">
      <div class="relative h-18 w-28 shrink-0 overflow-hidden rounded-lg bg-gray-900 shadow shadow-black/20">
        <img
          v-if="cover"
          :src="safeCover(cover)"
          referrerpolicy="no-referrer"
          class="h-full w-full object-cover"
          alt="" />
        <div
          v-else
          class="h-full w-full flex items-center justify-center text-xl text-gray-600">
          <TvIcon class="size-6" />
        </div>
        <span
          v-if="partBadge"
          class="absolute top-1 right-1 rounded-sm bg-black/60 px-1 py-0.5 text-2xs text-gray-50">
          {{ partBadge }}
        </span>
        <div class="absolute top-1.5 left-1.5 size-4.5 flex justify-center items-center bg-black/65 rounded-[3px]">
          <component
            :is="kindIcon"
            class="size-3 text-white" />
        </div>
      </div>

      <div class="min-w-0 flex-1 flex flex-col justify-between gap-2">
        <div class="mb-4 flex items-center">
          <div class="truncate text-sm text-[#f6f6f6] font-medium">{{ title }}</div>
        </div>
        <div class="min-w-0 flex items-center gap-1 text-xs text-gray-400">
          <span
            v-if="upName"
            class="h-4 w-6 flex shrink-0 items-center justify-center rounded-sm bg-pink-400/20 text-3xs text-pink-400 font-bold leading-none">
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
          <DownloadStatus
            v-if="lane === 'active'"
            :video="item.row.video"
            :page="item.row.page"
            :pages-total="item.row.pagesTotal"
            :folder-name="item.row.folderName" />
        </template>
        <div
          v-else-if="lane === 'active'"
          class="size-9 shrink-0 flex items-center justify-center rounded-full"
          :class="convertBadgeClass">
          <component
            :is="convertStatusIcon"
            class="size-4" />
        </div>
        <TaskCompleteActions
          v-if="lane === 'complete'"
          :delete-title="isDownload ? '删除下载任务？' : '删除转换任务？'"
          :delete-description="
            isDownload
              ? '默认只移除该分P记录。勾选后才会删除下载的视频文件。'
              : '默认只移除该任务记录。勾选后才会删除生成的视频文件。'
          "
          :can-delete="isDownload || canDeleteConvert"
          :can-reveal="Boolean(outputTarget)"
          :can-play="isPlayable"
          @delete="handleDelete"
          @reveal="openFileLocation"
          @details="detailsOpen = true"
          @play="openTaskFile">
          <template #fail>
            <div
              v-if="isDownload"
              class="size-6 rounded-full shrink-0 flex items-center justify-center bg-red-500/10 text-red-400 ring-1 ring-red-500/20">
              <CircleAlertIcon class="size-3" />
            </div>
            <div
              v-else
              class="size-6 rounded-full shrink-0 flex items-center justify-center"
              :class="convertBadgeClass">
              <component
                :is="convertStatusIcon"
                class="size-3" />
            </div>
          </template>
        </TaskCompleteActions>
      </div>
    </div>

    <TaskDetailsDrawer
      :title="isDownload ? '下载详情' : '文件详情'"
      :rows="detailRows"
      :open="detailsOpen"
      @close="detailsOpen = false" />
  </div>
</template>

<script setup lang="ts">
import {
  CircleAlert as CircleAlertIcon,
  CircleCheck as CircleCheckIcon,
  CirclePause as CirclePauseIcon,
  Download as DownloadIcon,
  FileOutput as FileOutputIcon,
  FileQuestion as FileQuestionIcon,
  Film as FilmIcon,
  Hourglass as HourglassIcon,
  Import as ImportIcon,
  PencilLine as PencilLineIcon,
  SkipForward as SkipForwardIcon,
  Tv as TvIcon
} from '@lucide/vue'
import DownloadStatus from '@renderer/components/DownloadStatus.vue'
import TaskCompleteActions from '@renderer/components/TaskCompleteActions.vue'
import TaskDetailsDrawer from '@renderer/components/TaskDetailsDrawer.vue'
import { convertDetailRows, downloadDetailRows } from '@renderer/components/taskDetails'
import { openLocalPath, revealLocalPath } from '@renderer/utils/open-file'
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

const isDownload = computed(() => props.item.kind === 'download')
const kindIcon = computed(() => (isDownload.value ? DownloadIcon : FilmIcon))

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
    return { progress: 0, status: 'idle' as const, message: '', outputPath: '' }
  }
  return downloadStore.getItem(props.item.row.video.bvid, props.item.row.page.cid)
})
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

const detailRows = computed(() => {
  if (props.item.kind === 'download') return downloadDetailRows(props.item.row, downloadItem.value)
  return convertDetailRows(props.item.task)
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
  await revealLocalPath(outputTarget.value)
}

const openTaskFile = async (): Promise<void> => {
  await openLocalPath(outputTarget.value)
}
</script>
