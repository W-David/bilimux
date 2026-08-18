<template>
  <div class="relative min-w-2xl w-full rounded-full h-15 card-border">
    <!-- bvid -->
    <div
      class="absolute top-0 left-0 z-10 bg-[#121212] text-pink-400 h-4.5 w-24 rounded-tl-[30px] rounded-br-[30px] rounded-tr-lg rounded-bl-lg shadow-md shadow-black/50 ring-1 ring-zinc-700 flex justify-center items-center">
      <span class="text-[10px] font-mono">{{ task.bvid }}</span>
    </div>
    <div class="flex items-center justify-between gap-4 w-full h-full px-2.5">
      <!-- 标题 -->
      <div class="min-w-0 flex-1">
        <div class="mt-2 flex items-center gap-2 ml-2">
          <span class="min-w-0 truncate text-[13px] text-zinc-300 font-medium tracking-wide">
            {{ task.title }}
          </span>
        </div>
      </div>

      <div
        v-if="actions === 'status'"
        class="size-9 shrink-0 flex items-center justify-center rounded-full"
        :class="badgeClass">
        <component
          :is="statusIcon"
          class="size-4" />
      </div>

      <button
        v-else-if="actions === 'info'"
        type="button"
        aria-label="文件详情"
        class="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-300 transition-colors duration-200 hover:bg-white/10 hover:text-white"
        @click="detailsOpen = true">
        <InfoIcon class="size-4" />
      </button>

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
            :disabled="!canDelete"
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
          :class="badgeClass">
          <component
            :is="statusIcon"
            class="size-3" />
        </div>
      </div>
    </div>

    <FileDetailsDrawer
      :task="task"
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
  FileOutput as FileOutputIcon,
  FileQuestion as FileQuestionIcon,
  FolderOpen as FolderOpenIcon,
  Hourglass as HourglassIcon,
  Import as ImportIcon,
  Info as InfoIcon,
  PencilLine as PencilLineIcon,
  SkipForward as SkipForwardIcon,
  Trash2 as Trash2Icon
} from '@lucide/vue'
import { openFolder, openPath } from '@renderer/api'
import { mittbus } from '@renderer/ipc'
import { useConvertStore } from '@renderer/store/convert'
import type { ConvertTask } from '@renderer/types/convert'
import { computed, ref } from 'vue'
import FileDetailsDrawer from './FileDetailsDrawer.vue'

const props = withDefaults(
  defineProps<{
    task: ConvertTask
    actions?: 'status' | 'info' | 'all'
  }>(),
  {
    actions: 'all'
  }
)

const convertStore = useConvertStore()
const detailsOpen = ref(false)

/** 删除按钮：历史任务，或实时任务已生成产物 */
const canDelete = computed(() => props.task.id.startsWith('history:') || Boolean(props.task.outputPath))

/** 优先操作产物文件，实时任务退回源文件路径 */
const outputTarget = computed(() => props.task.outputPath || props.task.filePath || '')

/** 播放按钮可用：成功或跳过 */
const isPlayable = computed(() => props.task.status === 'success' || props.task.status === 'skipped')

// const statusTextMap: Record<string, string> = {
//   importing: '导入中',
//   writing: '写入中',
//   preprocess: '预处理',
//   success: '已完成',
//   fail: '出错了',
//   skipped: '已跳过',
//   interrupted: '转换中断',
//   missing: '文件丢失',
//   waiting: '等待中'
// }

// const statusLabel = computed(() => statusTextMap[props.task.status] || '等待中')

const badgeClass = computed(() => ({
  'bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20':
    props.task.status === 'importing' || props.task.status === 'writing',
  'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20': props.task.status === 'preprocess',
  'bg-green-500/10 text-green-400 ring-1 ring-green-500/20': props.task.status === 'success',
  'bg-red-500/10 text-red-400 ring-1 ring-red-500/20': props.task.status === 'fail',
  'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20': props.task.status === 'skipped',
  'bg-slate-500/10 text-slate-300 ring-1 ring-slate-500/20': props.task.status === 'interrupted',
  'bg-red-400/10 text-red-300 ring-1 ring-red-400/30': props.task.status === 'missing',
  'bg-gray-500/10 text-gray-400 ring-1 ring-gray-500/20':
    props.task.status === 'waiting' || props.task.status === 'scanned',
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
    case 'scanned':
      return HourglassIcon
    default:
      return HourglassIcon
  }
})

/**
 * 删除任务：默认只删记录，勾选后同时删除产物文件
 */
const handleDelete = async (deleteFile: boolean): Promise<void> => {
  await convertStore.removeItem(props.task, deleteFile)
}

/**
 * 在文件管理器中显示文件所在位置
 */
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

/**
 * 使用系统默认程序打开视频文件
 */
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

<style scoped></style>
