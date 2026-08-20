<template>
  <ProgressCapsule
    :percent="showProgress ? item.progress : null"
    :label="idleLabel"
    :busy="showProgress"
    :paused="status === 'paused'"
    :cancellable="canCancel"
    :icon="statusIcon"
    :icon-spin="isMerging"
    :aria-label="ariaLabel"
    @click="handleClick">
    <template
      v-if="canCancel"
      #cancel>
      <DeleteTaskDialog
        title="取消下载？"
        description="将中止下载，删除缓存文件并移除该任务记录，此操作不可恢复。"
        @confirm="handleCancel">
        <button
          type="button"
          class="progress-capsule__x"
          aria-label="取消下载">
          <XIcon class="size-3.5" />
        </button>
      </DeleteTaskDialog>
    </template>
  </ProgressCapsule>
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
import ProgressCapsule from '@renderer/components/ProgressCapsule.vue'
import { emitter, mittbus } from '@renderer/ipc'
import { useDownloadStore } from '@renderer/store/download'
import type { BiliVideoPage, FavoriteResource } from '@shared/types'
import { computed } from 'vue'

const props = defineProps<{
  video: FavoriteResource
  folderName: string
  page: BiliVideoPage
  pagesTotal: number
}>()

const downloadStore = useDownloadStore()
const item = computed(() => downloadStore.getItem(props.video.bvid, props.page.cid))
const status = computed(() => item.value.status)
const message = computed(() => item.value.message)
const outputPath = computed(() => item.value.outputPath)

const taskKey = computed(() => ({ bvid: props.video.bvid, cid: props.page.cid }))

const isProgressing = computed(() =>
  ['waiting', 'downloading', 'preprocess', 'importing', 'writing'].includes(status.value)
)
const isMerging = computed(() => ['preprocess', 'importing', 'writing'].includes(status.value))
const canCancel = computed(() => isProgressing.value || status.value === 'paused')
const showProgress = computed(() => canCancel.value)

const idleLabel = computed(() => {
  switch (status.value) {
    case 'success':
      return '播放'
    case 'fail':
      return '重试'
    case 'idle':
      return '下载'
    default:
      return '下载'
  }
})

const ariaLabel = computed(() => {
  if (status.value === 'fail' && message.value) return message.value
  if (showProgress.value) return `下载进度 ${Math.round(item.value.progress)}%`
  return idleLabel.value
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
    case 'waiting':
      return PauseIcon
    case 'preprocess':
    case 'importing':
    case 'writing':
      return SettingsIcon
    default:
      return DownloadIcon
  }
})

const handleClick = (): void => {
  if (status.value === 'success') {
    void play()
    return
  }

  if (status.value === 'paused') {
    emitter.invoke('download:resume', taskKey.value)
    item.value.status = 'waiting'
    return
  }

  if (status.value === 'downloading' || status.value === 'waiting') {
    emitter.invoke('download:pause', taskKey.value)
    return
  }

  if (isProgressing.value) return

  downloadStore.enqueuePart(props.video, props.folderName, props.page, props.pagesTotal)
}

const handleCancel = (): void => {
  emitter.invoke('download:cancel', taskKey.value)
}

const play = async (): Promise<void> => {
  if (!outputPath.value) return
  const errMessage = await emitter.invoke('open-path', outputPath.value)
  if (errMessage) {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: errMessage
    })
  }
}
</script>
