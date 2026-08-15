<template>
  <div class="flex shrink-0 items-center gap-1">
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger as-child>
          <div
            class="relative h-8 min-w-20 flex cursor-pointer select-none items-center justify-center overflow-hidden rounded-full px-2 text-xs transition-all duration-200 card-glassy hover:ring-1"
            :class="rootClass"
            role="button"
            tabindex="0"
            @click="handleClick">
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

    <button
      v-if="canCancel"
      type="button"
      class="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-400 transition-colors card-glassy hover:text-red-400"
      aria-label="取消下载"
      @click.stop="handleCancel">
      <XIcon class="size-3.5" />
    </button>
  </div>
</template>

<script setup lang="ts">
import {
  CircleAlert as CircleAlertIcon,
  CirclePlay as CirclePlayIcon,
  Download as DownloadIcon,
  Pause as PauseIcon,
  Play as PlayIcon,
  Settings as SettingsIcon,
  X as XIcon
} from '@lucide/vue'
import {
  cancelDownloadVideo,
  openPath,
  pauseDownloadVideo,
  resumeDownloadVideo,
  startDownloadVideo
} from '@renderer/api'
import { mittbus } from '@renderer/ipc'
import { useDownloadStore } from '@renderer/store/download'
import type { BiliVideoPage, DownloadHistoryRecord, FavoriteResource } from '@shared/types'
import { computed, watch } from 'vue'

const props = defineProps<{
  video: FavoriteResource
  folderName: string
  page: BiliVideoPage
  pagesTotal: number
  history?: DownloadHistoryRecord | null
}>()

const downloadStore = useDownloadStore()
const item = computed(() => downloadStore.getItem(props.video.bvid, props.page.cid))
const status = computed(() => item.value.status)
const progress = computed(() => item.value.progress)
const message = computed(() => item.value.message)
const outputPath = computed(() => item.value.outputPath)

const taskKey = computed(() => ({ bvid: props.video.bvid, cid: props.page.cid }))

const isProgressing = computed(() =>
  ['waiting', 'downloading', 'preprocess', 'importing', 'writing'].includes(status.value)
)
const isMerging = computed(() => ['preprocess', 'importing', 'writing'].includes(status.value))
const canCancel = computed(() => isProgressing.value || status.value === 'paused')

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

const buildTask = () => ({
  bvid: props.video.bvid,
  cid: props.page.cid,
  page: props.page.page,
  pages: props.pagesTotal,
  part: props.page.part,
  title: props.video.title,
  uname: props.video.upper.name,
  folderName: props.folderName,
  coverUrl: props.video.cover
})

const handleClick = (): void => {
  if (status.value === 'success') {
    play()
    return
  }

  if (status.value === 'paused') {
    resumeDownloadVideo(taskKey.value)
    item.value.status = 'waiting'
    return
  }

  if (status.value === 'downloading' || status.value === 'waiting') {
    pauseDownloadVideo(taskKey.value)
    return
  }

  if (isProgressing.value) return

  const previous = status.value
  startDownloadVideo(buildTask())

  item.value.status = 'waiting'
  if (previous !== 'fail') {
    item.value.progress = 0
  }
}

const handleCancel = (): void => {
  cancelDownloadVideo(taskKey.value)
  item.value.status = 'fail'
  item.value.message = '已取消'
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
  const state = downloadStore.getItem(props.video.bvid, props.page.cid)
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

  if (historyStatus === 'cancelled') {
    state.status = 'fail'
    state.message = '已取消'
    return
  }

  if (historyStatus === 'interrupted' || historyStatus === 'downloading') {
    state.status = 'fail'
    state.message = '上次下载未完成'
    return
  }

  state.status = 'fail'
  state.message = '上次下载未完成'
}

watch(() => props.history, applyHistory, { immediate: true })
</script>

<style scoped></style>
