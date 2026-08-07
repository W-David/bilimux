<template>
  <div
    class="border border-black/5 bg-[#121212] shadow-sm shadow-black/50 hover:bg-[#202020] relative min-w-[42rem] w-full cursor-pointer overflow-hidden rounded-xl p-3">
    <!-- 内容区域 -->
    <div class="relative z-10 flex items-center justify-between gap-4">
      <!-- 状态徽章 -->
      <div class="w-20 shrink-0">
        <div
          class="flex select-none items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors"
          :class="badgeClass">
          <component
            :is="statusIcon"
            class="size-4" />
          <span>{{ statusLabel }}</span>
        </div>
      </div>

      <!-- 文件名 -->
      <div class="flex-1 truncate">
        <div class="truncate text-sm text-gray-200 font-medium tracking-wide">
          {{ task.fileName }}
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="h-8 w-8 flex shrink-0 items-center justify-center">
        <CirclePlayIcon
          v-if="task.status === 'success'"
          class="size-6 cursor-pointer text-green-400 transition-transform duration-200 hover:scale-110 hover:text-green-300"
          @click="openTaskFile" />
        <TooltipProvider v-else-if="task.status === 'fail'">
          <Tooltip>
            <TooltipTrigger as-child>
              <CircleAlertIcon class="size-6 cursor-help text-red-400" />
            </TooltipTrigger>
            <TooltipContent side="left">{{ task.message }}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider v-else-if="task.status === 'skipped'">
          <Tooltip>
            <TooltipTrigger as-child>
              <SkipForwardIcon class="size-6 cursor-help text-amber-400" />
            </TooltipTrigger>
            <TooltipContent side="left">{{ task.message }}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider v-else-if="task.status === 'interrupted'">
          <Tooltip>
            <TooltipTrigger as-child>
              <CirclePauseIcon class="size-6 cursor-help text-gray-400" />
            </TooltipTrigger>
            <TooltipContent side="left">{{ task.message }}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider v-else-if="task.status === 'missing'">
          <Tooltip>
            <TooltipTrigger as-child>
              <FileQuestionIcon class="size-6 cursor-help text-orange-400" />
            </TooltipTrigger>
            <TooltipContent side="left">{{ task.message }}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Spinner
          v-else
          class="size-5 shrink-0" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import type { ProgressStatus } from '@shared/types'

export type ConvertTaskStatus = ProgressStatus | 'skipped' | 'interrupted' | 'missing'

export interface ConvertTask {
  id: string
  fileName: string
  filePath: string
  status: ConvertTaskStatus
  progress: number
  finished: boolean
  message: string
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
  Hourglass as HourglassIcon,
  Import as ImportIcon,
  PencilLine as PencilLineIcon,
  SkipForward as SkipForwardIcon
} from '@lucide/vue'
import { openPath } from '@renderer/api'
import { mittbus } from '@renderer/ipc'
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
  interrupted: '已中断',
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

/**
 * 使用系统默认程序打开视频文件
 */
const openTaskFile = async (): Promise<void> => {
  if (!props.task.filePath) {
    mittbus.emit('toast:add', {
      severity: 'warn',
      summary: '提示',
      detail: '文件路径不存在',
      life: 3000
    })
    return
  }

  const errMessage = await openPath(props.task.filePath)
  if (errMessage) {
    mittbus.emit('toast:add', {
      severity: 'error',
      summary: '错误',
      detail: errMessage,
      life: 3000
    })
  }
}
</script>

<style scoped></style>
