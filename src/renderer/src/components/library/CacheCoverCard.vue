<template>
  <button
    type="button"
    class="group flex w-full flex-col gap-2 overflow-hidden rounded-xl text-left transition-colors duration-200 p-2"
    :class="playable ? 'cursor-pointer hover:bg-white/4' : 'cursor-default'"
    @click="onClick">
    <div class="relative aspect-video overflow-hidden bg-gray-900 rounded-lg">
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
    <div class="min-w-0 flex flex-col flex-1">
      <div class="line-clamp-2 text-xs text-zinc leading-5 flex-1">{{ task.title }}</div>
      <div class="mt-1.5 flex min-w-0 items-center gap-1.5 text-[10px] text-gray-500 shrink-0">
        <template v-if="task.uname">
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

const onClick = (): void => {
  if (!playable.value) return
  emit('play')
}
</script>
