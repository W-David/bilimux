<template>
  <ProgressRing
    :percent="progress.percent"
    :title="title"
    :description="description" />
</template>

<script setup lang="ts">
import ProgressRing from '@renderer/components/ProgressRing.vue'
import { useFavoritesStore } from '@renderer/store/favorites'
import { computed } from 'vue'

const favoritesStore = useFavoritesStore()
const progress = computed(() => favoritesStore.progress)

const title = computed(() => {
  const p = progress.value
  if (p.phase === 'list') return '正在获取收藏夹列表'
  if (p.phase === 'folder') return `正在获取收藏夹 ${p.currentFolderIndex}/${p.totalFolders}`
  return '正在获取收藏夹'
})

const description = computed(() => {
  const p = progress.value
  if (p.phase === 'folder') {
    const pageText = p.currentVideoPage > 0 ? `（第 ${p.currentVideoPage} 页）` : ''
    return `${p.currentFolderTitle}${pageText}`
  }
  return ''
})
</script>

<style scoped></style>
