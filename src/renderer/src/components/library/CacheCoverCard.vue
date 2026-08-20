<template>
  <button
    type="button"
    class="card-border group flex w-full flex-col overflow-hidden rounded-xl text-left shadow-lg shadow-black/40 transition-colors duration-200"
    :class="playable ? 'cursor-pointer hover:bg-white/4' : 'cursor-default'"
    @click="onClick">
    <div class="relative aspect-video overflow-hidden bg-gray-900">
      <img
        v-if="cover"
        :src="safeCover(cover)"
        referrerpolicy="no-referrer"
        class="h-full w-full object-cover"
        alt="" />
      <div
        v-else
        class="h-full w-full flex items-center justify-center text-gray-600">
        <TvIcon class="size-8" />
      </div>
      <div
        v-if="badge"
        class="absolute top-1.5 left-1.5 rounded-sm px-1.5 py-0.5 text-[10px] text-white"
        :class="badgeClass">
        {{ badge }}
      </div>
      <div
        v-if="converting"
        class="absolute inset-0 flex items-center justify-center bg-black/40">
        <ProgressRing
          compact
          :percent="task.progress" />
      </div>
      <div
        v-else-if="playable"
        class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <div class="flex size-12 items-center justify-center rounded-full bg-black/60 text-white">
          <PlayIcon class="size-6 fill-white" />
        </div>
      </div>
    </div>
    <div class="min-w-0 px-2.5 py-2">
      <div class="line-clamp-2 text-sm text-[#f6f6f6] leading-5">{{ task.title }}</div>
      <div class="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-gray-500">
        <template v-if="task.uname">
          <span
            class="h-4 w-6 flex shrink-0 items-center justify-center rounded-sm bg-pink-400/20 text-[9px] text-pink-400 font-bold leading-none">
            UP
          </span>
          <span class="min-w-0 truncate">{{ task.uname }}</span>
        </template>
        <span
          v-if="sizeText"
          class="ml-auto shrink-0 tabular-nums">
          {{ sizeText }}
        </span>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { Play as PlayIcon, Tv as TvIcon } from '@lucide/vue'
import ProgressRing from '@renderer/components/ProgressRing.vue'
import type { ConvertTask } from '@renderer/types/convert'
import { formatFileSize, safeCover } from '@renderer/utils/media'
import { computed } from 'vue'

const CONVERTING = new Set(['waiting', 'preprocess', 'importing', 'writing'])

const props = defineProps<{
  task: ConvertTask
}>()

const emit = defineEmits<{
  (e: 'play'): void
}>()

const cover = computed(() => props.task.coverUrl || '')
const converting = computed(() => CONVERTING.has(props.task.status))
const playable = computed(() => {
  if (!props.task.outputPath) return false
  if (props.task.fileExists === false) return false
  return props.task.status === 'success' || props.task.status === 'skipped'
})
const sizeText = computed(() => formatFileSize(props.task.fileSize) || '')

const badge = computed(() => {
  if (converting.value) return '转换中'
  if (props.task.status === 'fail') return '失败'
  if (props.task.status === 'missing' || props.task.fileExists === false) return '文件丢失'
  if (props.task.status === 'scanned' || props.task.status === 'interrupted') return '待转换'
  if (playable.value) return '可播放'
  return ''
})

const badgeClass = computed(() => {
  if (props.task.status === 'fail' || props.task.status === 'missing' || props.task.fileExists === false) {
    return 'bg-red-600/80'
  }
  if (converting.value) return 'bg-pink-500/85'
  if (playable.value) return 'bg-green-600/80'
  return 'bg-zinc-600/80'
})

const onClick = (): void => {
  if (!playable.value) return
  emit('play')
}
</script>
