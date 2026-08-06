<template>
  <div class="rounded-xl bg-gray-800/40 p-3 shadow-black/40 shadow-sm ring-1 ring-white/5">
    <!-- 展示区 -->
    <div class="flex items-center gap-3">
      <div class="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-gray-900">
        <img
          v-if="video.cover"
          :src="safeCover(video.cover)"
          referrerpolicy="no-referrer"
          class="h-full w-full object-cover"
          alt="" />
        <div
          v-else
          class="h-full w-full flex items-center justify-center text-xl text-gray-600">
          <i class="i-mdi-television-play"></i>
        </div>
        <span class="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[10px] text-light">
          {{ formatDuration(video.duration) }}
        </span>
      </div>

      <div class="min-w-0 flex-1">
        <div class="truncate text-sm text-light font-medium">{{ video.title }}</div>
        <div class="mt-2 flex items-center justify-between gap-2">
          <div class="min-w-0 flex items-center gap-1 text-xs text-gray-400">
            <span
              class="h-4 w-6 flex shrink-0 items-center justify-center rounded bg-pink/20 text-[9px] text-pink-400 font-bold leading-none">
              UP
            </span>
            <span class="truncate">{{ video.upper.name }}</span>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <template v-if="video.attr !== 0">
              <span class="text-xs text-gray-500">已失效</span>
            </template>
            <DownloadStatus
              v-else
              :video="video"
              :history="history"
              :folder-name="folderName"></DownloadStatus>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DownloadStatus from '@renderer/components/DownloadStatus.vue'
import { safeCover, formatDuration } from '@renderer/utils/media'
import type { DownloadHistoryRecord, FavoriteResource } from '@shared/types'

defineProps<{
  video: FavoriteResource
  folderName: string
  history?: DownloadHistoryRecord | null
}>()
</script>
