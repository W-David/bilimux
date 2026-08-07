<template>
  <div
    v-if="progress.running"
    class="w-full flex flex-col gap-1 px-4 py-2">
    <div class="h-1 w-full overflow-hidden rounded-full bg-gray-800">
      <div
        class="h-full rounded-full bg-pink-500 transition-all duration-300"
        :style="{ width: `${progress.percent}%` }"></div>
    </div>
    <div class="text-xs text-gray-400">
      {{ statusText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFavoritesStore } from '@renderer/store/favorites'
import { computed } from 'vue'

const favoritesStore = useFavoritesStore()
const progress = computed(() => favoritesStore.progress)

const statusText = computed(() => {
  if (progress.value.phase === 'list') {
    return '正在获取收藏夹列表...'
  }
  if (progress.value.phase === 'folder') {
    const pageText = progress.value.currentVideoPage > 0 ? `（第 ${progress.value.currentVideoPage} 页）` : ''
    return `正在获取收藏夹 ${progress.value.currentFolderIndex}/${progress.value.totalFolders}：${progress.value.currentFolderTitle}${pageText}`
  }
  return ''
})
</script>

<style scoped></style>
