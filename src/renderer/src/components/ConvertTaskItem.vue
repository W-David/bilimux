<template>
  <div
    class="border border-black/5 bg-[#121212] shadow-sm shadow-black/50 hover:bg-[#202020] relative min-w-2xl w-full cursor-pointer overflow-hidden rounded-xl p-2">
    <!-- Line1 -->
    <div class="flex items-center justify-between gap-4">
      <!-- bvid -->
      <div
        v-if="task.bvid"
        class="shrink-0 rounded-3xl ring-1 ring-pink-300/20 w-28 h-6 bg-pink-400/10 flex">
        <span class="m-auto text-xs font-mono text-pink-300">{{ task.bvid }}</span>
      </div>

      <!-- 标题 -->
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <span class="min-w-0 truncate text-sm text-gray-200 font-medium tracking-wide">
            {{ task.title }}
          </span>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="h-8 w-8 flex shrink-0 items-center justify-center">
        <TooltipProvider v-if="isFileMissing">
          <Tooltip>
            <TooltipTrigger as-child>
              <FileQuestionIcon class="size-6 text-orange-400" />
            </TooltipTrigger>
            <TooltipContent side="left">产物文件已丢失</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <CirclePlayIcon
          v-else-if="task.status === 'success' || task.status === 'skipped'"
          class="size-6 cursor-pointer text-green-400 transition-transform duration-200 hover:text-green-300"
          @click="openTaskFile" />
        <TooltipProvider v-else-if="task.status === 'fail'">
          <Tooltip>
            <TooltipTrigger as-child>
              <CircleAlertIcon class="size-6 text-red-400" />
            </TooltipTrigger>
            <TooltipContent side="left">{{ task.message }}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider v-else-if="task.status === 'interrupted'">
          <Tooltip>
            <TooltipTrigger as-child>
              <CirclePauseIcon class="size-6 text-gray-400" />
            </TooltipTrigger>
            <TooltipContent side="left">{{ task.message }}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Spinner
          v-else
          class="size-5 shrink-0" />
      </div>
    </div>

    <Separator class="my-2"></Separator>

    <!-- Line2 -->
    <div class="flex items-center justify-between gap-4">
      <!-- 状态信息 -->
      <div
        class="w-24 rounded-2xl h-8 shrink-0 flex items-center justify-between pl-2 pr-3 transition-all text-xs"
        :class="badgeClass">
        <component
          :is="statusIcon"
          class="size-4" />
        <span>{{ statusLabel }}</span>
      </div>

      <!-- 完成信息 -->
      <div
        v-if="showCompletedMeta"
        class="mt-1.5 flex items-center gap-2">
        <span
          v-if="task.durationMs != null"
          class="flex items-center gap-1 rounded-md bg-black/20 px-1.5 py-0.5 text-xs text-gray-400">
          <TimerIcon class="size-3.5 text-pink-400/80" />
          {{ formatDurationMs(task.durationMs) }}
        </span>
        <span
          v-if="task.fileSize != null && task.fileSize > 0"
          class="flex items-center gap-1 rounded-md bg-black/20 px-1.5 py-0.5 text-xs text-gray-400">
          <HardDriveIcon class="size-3.5 text-pink-400/80" />
          {{ formatFileSize(task.fileSize) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import type { ProgressStatus } from '@shared/types'
import Separator from './ui/separator/Separator.vue'

export type ConvertTaskStatus = ProgressStatus | 'skipped' | 'interrupted' | 'missing'

export interface ConvertTask {
  id: string
  fileName: string
  filePath: string
  status: ConvertTaskStatus
  progress: number
  finished: boolean
  message: string
  bvid: string
  title: string
  durationMs?: number | null
  fileSize?: number | null
  fileExists?: boolean
}
</script>

<script setup lang="ts">
import {
  CircleAlert as CircleAlertIcon,
  CircleCheck as CircleCheckIcon,
  CirclePause as CirclePauseIcon,
  CirclePlay as CirclePlayIcon,
  FileOutput as FileOutputIcon,
  FileQuestion as FileQuestionIcon,
  HardDrive as HardDriveIcon,
  Hourglass as HourglassIcon,
  Import as ImportIcon,
  PencilLine as PencilLineIcon,
  SkipForward as SkipForwardIcon,
  Timer as TimerIcon
} from '@lucide/vue'
import { openPath } from '@renderer/api'
import { mittbus } from '@renderer/ipc'
import { formatDurationMs, formatFileSize } from '@renderer/utils/media'
import { computed } from 'vue'

const props = defineProps<{
  task: ConvertTask
}>()

const statusTextMap: Record<string, string> = {
  importing: '导入中',
  writing: '写入中',
  preprocess: '预处理',
  success: '已完成',
  fail: '出错了',
  skipped: '已跳过',
  interrupted: '转换中断',
  missing: '文件丢失',
  waiting: '等待中'
}

const statusLabel = computed(() => statusTextMap[props.task.status] || '等待中')

const badgeClass = computed(() => ({
  'bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20':
    props.task.status === 'importing' || props.task.status === 'writing',
  'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20': props.task.status === 'preprocess',
  'bg-green-500/10 text-green-400 ring-1 ring-green-500/20': props.task.status === 'success',
  'bg-red-500/10 text-red-400 ring-1 ring-red-500/20': props.task.status === 'fail',
  'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20': props.task.status === 'skipped',
  'bg-slate-500/10 text-slate-300 ring-1 ring-slate-500/20': props.task.status === 'interrupted',
  'bg-red-400/10 text-red-300 ring-1 ring-red-400/30': props.task.status === 'missing',
  'bg-gray-500/10 text-gray-400 ring-1 ring-gray-500/20': props.task.status === 'waiting',
  'animate-pulse':
    props.task.status === 'preprocess' || props.task.status === 'importing' || props.task.status === 'writing'
}))

const statusIcon = computed(() => {
  switch (props.task.status) {
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
    case 'waiting':
      return HourglassIcon
    default:
      return HourglassIcon
  }
})

/** 产物是否丢失：显式 missing，或已完成/跳过但文件不存在 */
const isFileMissing = computed(
  () =>
    props.task.status === 'missing' ||
    ((props.task.status === 'success' || props.task.status === 'skipped') && props.task.fileExists === false)
)

/** 任务完成（成功/跳过）后展示耗时与文件大小 */
const showCompletedMeta = computed(() => props.task.status === 'success' || props.task.status === 'skipped')

/**
 * 使用系统默认程序打开视频文件
 */
const openTaskFile = async (): Promise<void> => {
  if (!props.task.filePath) {
    mittbus.emit('toast:add', {
      severity: 'warn',
      message: '文件路径不存在'
    })
    return
  }

  const errMessage = await openPath(props.task.filePath)
  if (errMessage) {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: errMessage
    })
  }
}
</script>

<style scoped></style>
