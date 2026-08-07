<template>
  <div class="flex items-center gap-1">
    <!-- 状态胶囊按钮 -->
    <div
      v-tooltip.top="status === 'fail' ? message : undefined"
      class="relative h-7 min-w-20 flex cursor-pointer select-none items-center justify-center overflow-hidden border rounded-full px-2 text-xs transition-colors"
      :class="rootClass"
      role="button"
      tabindex="0"
      @click="handleClick">
      <!-- 下载进度背景 -->
      <div
        v-if="isProgressing"
        class="absolute inset-y-0 left-0 bg-pink-400/25 transition-all duration-300"
        :style="{ width: `${progress}%` }"></div>

      <span class="relative z-10 flex items-center gap-1">
        <i :class="iconClass"></i>
        <span>{{ label }}</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
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

const rootClass = computed(() => {
  switch (status.value) {
    case 'success':
      return 'border-green-400 text-green-400 bg-green-400/5 hover:bg-green-400/25'
    case 'fail':
      return 'border-red-400 text-red-400 bg-red-400/5 hover:bg-red-400/15'
    case 'paused':
      return 'border-slate-400 text-slate-300 bg-slate-400/5 hover:bg-slate-400/15'
    case 'idle':
      return 'border-pink-400 text-pink-400 bg-pink-400/5 hover:bg-pink-400/15'
    default:
      return 'border-pink-400 text-pink-400'
  }
})

const iconClass = computed(() => {
  switch (status.value) {
    case 'success':
      return 'i-mdi-play-circle'
    case 'fail':
      return 'i-mdi-alert-circle'
    case 'paused':
      return 'i-mdi-play'
    case 'downloading':
      return 'i-mdi-pause'
    case 'waiting':
      return 'i-mdi-pause'
    case 'preprocess':
      return 'i-mdi-cog animate-spin'
    case 'importing':
      return 'i-mdi-cog animate-spin'
    case 'writing':
      return 'i-mdi-cog animate-spin'
    default:
      return 'i-mdi-download'
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
      summary: '错误',
      detail: errMessage,
      life: 3000
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
