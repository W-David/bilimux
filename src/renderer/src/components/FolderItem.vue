<template>
  <div
    :class="[
      'mb-2 cursor-pointer p-3 transition-al duration-200  shadow-black/50 shadow-sm hover:text-white rounded-xl',
      active ? 'text-pink-300 bg-pink/10 shadow-black' : ''
    ]"
    @click="emit('select', folder)">
    <div class="flex items-center gap-3">
      <div class="relative h-20 w-28 shrink-0 pt-4">
        <!-- 叠卡装饰：放在封面容器前面，靠 DOM 顺序压在封面后面；不要用负 z-index，会被页面背景盖住 -->
        <div
          class="absolute left-0 right-0 top-1 m-auto h-4 w-[80%] rounded-[6px] bg-[#3a3d43] shadow-black/40 shadow-sm"></div>
        <div
          class="absolute left-0 right-0 top-2.5 m-auto h-4 w-[90%] rounded-[6px] bg-[#45494f] shadow-black/40 shadow-sm"></div>
        <!-- 封面元素 -->
        <div class="relative h-full w-full overflow-hidden rounded-lg bg-gray-900 shadow-black/50 shadow-lg">
          <img
            v-if="folder.cover"
            :src="safeCover(folder.cover)"
            referrerpolicy="no-referrer"
            class="h-full w-full object-cover"
            alt="" />
          <div
            v-else
            class="h-full w-full flex items-center justify-center text-xl text-gray-600">
            <i class="i-mdi-television-play"></i>
          </div>
          <div
            v-if="folder.ctime"
            class="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[10px] text-light">
            {{ formatDate(folder.ctime) }}
          </div>
        </div>
      </div>
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-medium">{{ folder.title }}</div>
        <div class="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
          <i :class="isPrivateFolder(folder) ? 'i-mdi-lock-outline' : 'i-mdi-earth'"></i>
          <span>
            {{ isPrivateFolder(folder) ? '私密' : '公开' }}
          </span>
          <span>· {{ folder.media_count }} 个视频</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FavoriteFolderData } from '@renderer/services/favorites'
import { formatDate, isPrivateFolder, safeCover } from '@renderer/utils/media'

defineProps<{
  folder: FavoriteFolderData
  active: boolean
}>()

const emit = defineEmits<{
  (e: 'select', folder: FavoriteFolderData): void
}>()
</script>
