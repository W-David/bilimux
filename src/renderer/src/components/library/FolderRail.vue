<template>
  <aside
    ref="rootRef"
    class="h-full overflow-y-auto border-r border-[#1f1f1f] bg-[#161616] p-4"
    @scroll="onScroll">
    <div class="px-2 pb-2 text-[11px] text-gray-500">{{ folders.length }} 个收藏夹</div>
    <button
      v-for="folder in folders"
      :key="folder.id"
      type="button"
      class="mb-1 grid w-full grid-cols-[36px_1fr] items-center gap-2 rounded-lg p-2 text-left"
      :class="folder.id === selectedId ? 'bg-white/5 ring-1 ring-black/5' : 'hover:bg-white/5'"
      @click="emit('select', folder)">
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
        <div class="truncate text-xs text-[#e5e7eb]">
          {{ folder.title }}
          <span
            v-if="isPrivateFolder(folder)"
            class="ml-1 rounded border border-white/10 px-1 text-[9px] text-gray-400">
            私密
          </span>
        </div>
        <div class="mt-0.5 text-[10px] text-gray-500">{{ folder.media_count }} 个内容</div>
      </div>
    </button>
    <div
      v-if="loadingMore"
      class="px-2 py-2 text-center text-[11px] text-gray-500">
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
