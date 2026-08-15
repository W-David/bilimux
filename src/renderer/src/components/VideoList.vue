<template>
  <div class="min-w-0 flex flex-1 flex-col overflow-hidden">
    <!-- 错误状态 -->
    <div
      v-if="errorMessage"
      class="flex flex-1 flex-col items-center justify-center gap-4">
      <div class="text-sm text-red-400">{{ errorMessage }}</div>
      <Button
        size="sm"
        variant="destructive"
        @click="emit('retry')">
        <RefreshCwIcon data-icon="inline-start" />
        重试
      </Button>
    </div>

    <!-- 未选择收藏夹 -->
    <div
      v-else-if="currentFolder?.fetchError"
      class="flex flex-1 flex-col items-center justify-center gap-4">
      <div class="text-sm text-red-400">{{ currentFolder.fetchError }}</div>
      <Button
        size="sm"
        variant="destructive"
        @click="emit('retry')">
        <RefreshCwIcon data-icon="inline-start" />
        重试
      </Button>
    </div>

    <div
      v-else-if="!currentFolder"
      class="flex flex-1 items-center justify-center text-sm text-gray-400">
      请选择左侧收藏夹
    </div>

    <!-- 收藏视频列表 -->
    <div
      v-else
      class="flex-1 overflow-y-auto p-3">
      <div
        v-if="videos.length === 0"
        class="h-full flex items-center justify-center text-sm text-gray-400">
        该收藏夹暂无视频
      </div>
      <div
        v-else
        class="flex flex-col gap-3">
        <VideoItem
          v-for="video in videos"
          :key="video.bvid"
          :video="video"
          :folder-name="currentFolder.title"
          :history="historyMap.get(video.bvid)"></VideoItem>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RefreshCw as RefreshCwIcon } from '@lucide/vue'
import type { DownloadHistoryRecord, FavoriteFolderData, FavoriteResource } from '@shared/types'
import VideoItem from './VideoItem.vue'

defineProps<{
  videos: FavoriteResource[]
  errorMessage: string
  currentFolder: FavoriteFolderData | null
  historyMap: Map<string, DownloadHistoryRecord>
}>()

const emit = defineEmits<{
  (e: 'retry'): void
}>()
</script>
