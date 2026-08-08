<template>
  <div class="w-72 flex shrink-0 flex-col border-r border-[#1f1f1f] border-solid">
    <div class="flex-1 overflow-y-auto p-3">
      <div
        v-if="folders.length === 0 && !errorMessage"
        class="py-8 text-center text-xs text-gray-400">
        暂无收藏夹
      </div>

      <FolderItem
        v-for="folder in folders"
        :key="folder.id"
        :folder="folder"
        :active="currentFolderId === folder.id"
        @select="emit('select', $event)"></FolderItem>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FavoriteFolderData } from '@renderer/services/favorites'
import FolderItem from './FolderItem.vue'

defineProps<{
  folders: FavoriteFolderData[]
  errorMessage: string
  currentFolderId: number | null
}>()

const emit = defineEmits<{
  (e: 'select', folder: FavoriteFolderData): void
}>()
</script>
