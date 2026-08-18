<template>
  <button
    type="button"
    class="flex w-full cursor-pointer flex-col gap-2 text-left"
    @click="emit('select', folder)">
    <div class="relative pt-3">
      <div class="absolute left-0 right-0 top-0 m-auto h-3 w-[84%] rounded-t-md bg-[#3a3d43]"></div>
      <div class="absolute left-0 right-0 top-1.5 m-auto h-3 w-[92%] rounded-t-md bg-[#45494f]"></div>
      <div class="group relative aspect-video overflow-hidden rounded-lg bg-gray-900 shadow-lg shadow-black/40">
        <img
          v-if="folder.cover"
          :src="safeCover(folder.cover)"
          referrerpolicy="no-referrer"
          class="cover-zoom-img"
          alt="" />
        <div
          v-else
          class="h-full w-full flex items-center justify-center text-gray-600">
          <TvIcon class="size-8" />
        </div>
        <span class="absolute bottom-1.5 left-1.5 text-[11px] text-white/90 drop-shadow">
          {{ folder.media_count }}个内容{{ isPrivateFolder(folder) ? '·私密' : '·公开' }}
        </span>
      </div>
    </div>
    <div class="min-w-0 px-0.5">
      <div class="line-clamp-1 text-sm text-[#f6f6f6] font-medium">{{ folder.title }}</div>
      <div
        v-if="folder.ctime"
        class="mt-1 text-xs text-gray-500">
        创建于{{ formatDate(folder.ctime) }}
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { Tv as TvIcon } from '@lucide/vue'
import { formatDate, isPrivateFolder, safeCover } from '@renderer/utils/media'
import type { FavoriteFolder } from '@shared/types'

defineProps<{
  folder: FavoriteFolder
}>()

const emit = defineEmits<{
  (e: 'select', folder: FavoriteFolder): void
}>()
</script>
