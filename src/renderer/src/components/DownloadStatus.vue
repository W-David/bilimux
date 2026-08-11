<template>
  <div class="flex items-center gap-1">
    <!-- 状态胶囊按钮 -->
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger as-child>
          <div
            class="relative h-8 min-w-20 flex cursor-pointer select-none items-center justify-center overflow-hidden rounded-full px-2 text-xs transition-all duration-200 card-glassy hover:ring-1"
            :class="rootClass"
            role="button"
            tabindex="0"
            @click="handleClick">
            <!-- 下载进度背景 -->
            <div
              v-show="isProgressing"
              class="absolute inset-y-0 left-0 bg-pink-400/25 transition-all duration-300"
              :style="{ width: `${progress}%` }"></div>

            <span class="relative z-10 flex items-center gap-1">
              <component
                :is="statusIcon"
                class="size-4"
                :class="{ 'animate-spin': isMerging }" />
              <span>{{ label }}</span>
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent v-if="status === 'fail'">{{ message }}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
</template>

<script setup lang="ts">
import {
  CircleAlert as CircleAlertIcon,
  CirclePlay as CirclePlayIcon,
  Download as DownloadIcon,
  Pause as PauseIcon,
  Play as PlayIcon,
  Settings as SettingsIcon
} from '@lucide/vue'
import { openPath, pauseDownloadVideo, resumeDownloadVideo, startDownloadVideo } from '@renderer/api'
import { mittbus } from '@renderer/ipc'
import { useDownloadStore } from '@renderer/store/download'
import type { DownloadHistoryRecord, FavoriteResource } from '@shared/types'
import { computed, watch } from 'vue'

const props = defineProps<{
  video: FavoriteResource
  folderName: string
  history?: DownloadHistoryRecord | null
}>()

const downloadStore = useDownloadStore()
const item = computed(() => downloadStore.getItem(props.video.bvid))
const status = computed(() => item.value.status)
const progress = computed(() => item.value.progress)
const message = computed(() => item.value.message)
const outputPath = computed(() => item.value.outputPath)

const isProgressing = computed(() =>
  ['waiting', 'downloading', 'preprocess', 'importing', 'writing'].includes(status.value)
)
const isMerging = computed(() => ['preprocess', 'importing', 'writing'].includes(status.value))

const rootClass = computed(() => {
  switch (status.value) {
    case 'success':
      return 'text-green-400 hover:ring-green-400/20'
    case 'fail':
      return 'text-red-400 hover:ring-red-400/20'
    case 'paused':
      return 'text-slate-300 hover:ring-slate-300/20'
    case 'idle':
      return 'text-pink-400 hover:ring-pink-400/20'
    default:
      return 'text-pink-400 hover:ring-pink-400/20'
  }
})

const statusIcon = computed(() => {
  switch (status.value) {
    case 'success':
      return CirclePlayIcon
    case 'fail':
      return CircleAlertIcon
    case 'paused':
      return PlayIcon
    case 'downloading':
      return PauseIcon
    case 'waiting':
      return PauseIcon
    case 'preprocess':
      return SettingsIcon
    case 'importing':
      return SettingsIcon
    case 'writing':
      return SettingsIcon
    default:
      return DownloadIcon
  }
})

const label = computed(() => {
  switch (status.value) {
    case 'success':
      return '播放'
    case 'fail':
      return '重新下载'
    case 'paused':
      return '继续下载'
    case 'preprocess':
      return '合成中'
    case 'importing':
      return '合成中'
    case 'writing':
      return '合成中'
    case 'idle':
      return '下载'
    default:
      return `${progress.value}%`
  }
})

const handleClick = (): void => {
  if (status.value === 'success') {
    play()
    return
  }

  if (status.value === 'paused') {
    resumeDownloadVideo(props.video.bvid)
    item.value.status = 'waiting'
    return
  }

  if (status.value === 'downloading' || status.value === 'waiting') {
    pauseDownloadVideo(props.video.bvid)
    return
  }

  if (isProgressing.value) return

  const previous = status.value
  startDownloadVideo({
    bvid: props.video.bvid,
    title: props.video.title,
    uname: props.video.upper.name,
    folderName: props.folderName,
    coverUrl: props.video.cover
  })

  item.value.status = 'waiting'
  if (previous !== 'fail') {
    item.value.progress = 0
  }
}

const play = async (): Promise<void> => {
  if (!outputPath.value) return
  const errMessage = await openPath(outputPath.value)
  if (errMessage) {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: errMessage
    })
  }
}

/**
 * 根据持久化历史初始化组件状态（仅在没有实时事件覆盖时生效）
 */
const applyHistory = (): void => {
  const state = downloadStore.getItem(props.video.bvid)
  if (!props.history || state.status !== 'idle') return

  const { status: historyStatus, fileExists, outputPath: path } = props.history
  const fileAvailable = Boolean(path && fileExists)
  if ((historyStatus === 'completed' || historyStatus === 'missing') && fileAvailable) {
    state.status = 'success'
    state.progress = 100
    state.outputPath = path || ''
    return
  }

  if (historyStatus === 'completed' || historyStatus === 'missing') {
    state.status = 'fail'
    state.message = '文件已丢失'
    return
  }

  if (historyStatus === 'failed') {
    state.status = 'fail'
    state.message = '上次下载失败'
    return
  }

  state.status = 'fail'
  state.message = '上次下载未完成'
}

watch(() => props.history, applyHistory, { immediate: true })
</script>

<style scoped></style>
