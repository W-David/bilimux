<template>
  <button
    type="button"
    class="flex w-full cursor-pointer flex-col gap-2 text-left"
    @click="emit('select', item)">
    <div class="group relative aspect-2/3 overflow-hidden rounded-lg bg-gray-900">
      <img
        :src="safeCover(item.cover)"
        referrerpolicy="no-referrer"
        class="cover-zoom-img"
        alt="" />
      <span
        v-if="item.badge"
        class="absolute top-1.5 right-1.5 rounded-sm bg-sky-500 px-1 py-0.5 text-[10px] text-white">
        {{ item.badge }}
      </span>
      <span
        v-if="item.newEpIndexShow"
        class="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent px-1.5 pb-1.5 pt-6 text-right text-[11px] text-white/90">
        {{ item.newEpIndexShow }}
      </span>
    </div>
    <div class="min-w-0 px-0.5">
      <div class="line-clamp-1 text-sm text-[#f6f6f6] font-medium">{{ item.title }}</div>
      <div class="mt-1 text-xs text-gray-500">{{ item.progress || '尚未观看' }}</div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { safeCover } from '@renderer/utils/media'
import type { BangumiFollowItem } from '@shared/types'

defineProps<{
  item: BangumiFollowItem
}>()

const emit = defineEmits<{
  (e: 'select', item: BangumiFollowItem): void
}>()
</script>
