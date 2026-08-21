<template>
  <aside
    ref="rootRef"
    class="h-full min-w-0 overflow-x-hidden overflow-y-auto border-r border-secondary bg-[#161616] p-4"
    @scroll="onScroll">
    <div class="px-2 pb-2 text-caption text-gray-500">{{ folders.length }} 个收藏夹</div>
    <button
      v-for="folder in folders"
      :key="folder.id"
      type="button"
      class="relative mb-1 grid w-full grid-cols-[40px_1fr] items-center gap-3 rounded-lg p-2 text-left border-l-2 border-l-transparent transition-all duration-200"
      :class="folder.id === selectedId ? 'bg-pink-400/10 border-l-pink-400!' : 'hover:bg-white/5'"
      @click="emit('select', folder)">
      <!-- <span
        v-if="folder.id === selectedId"
        class="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-pink-400" /> -->
      <div class="size-10 overflow-hidden rounded-md bg-gray-900">
        <img
          v-if="folder.cover"
          :src="safeCover(folder.cover)"
          referrerpolicy="no-referrer"
          class="h-full w-full object-cover"
          alt="" />
        <div
          v-else
          class="h-full w-full flex items-center justify-center text-gray-600">
          <FolderIcon class="size-4" />
        </div>
      </div>
      <div class="min-w-0">
        <div
          class="truncate text-xs"
          :class="folder.id === selectedId ? 'text-pink-300' : 'text-foreground'">
          {{ folder.title }}
          <span
            v-if="isPrivateFolder(folder)"
            class="ml-1 rounded border border-white/10 px-1 text-3xs text-gray-400">
            私密
          </span>
        </div>
        <div class="mt-0.5 text-2xs text-gray-500">{{ folder.media_count }} 个内容</div>
      </div>
    </button>
    <div
      v-if="loadingMore"
      class="px-2 py-2 text-center text-caption text-gray-500">
      加载更多…
    </div>
  </aside>
</template>

<script setup lang="ts">
import { Folder as FolderIcon } from '@lucide/vue'
import { isPrivateFolder, safeCover } from '@renderer/utils/media'
import type { FavoriteFolder } from '@shared/types'
import { ref } from 'vue'

defineProps<{
  folders: FavoriteFolder[]
  selectedId?: number
  loadingMore?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', folder: FavoriteFolder): void
  (e: 'load-more'): void
}>()

const rootRef = ref<HTMLElement | null>(null)

const onScroll = (): void => {
  const el = rootRef.value
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) emit('load-more')
}
</script>
