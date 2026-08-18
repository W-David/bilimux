<template>
  <button
    type="button"
    class="card-border w-full cursor-pointer overflow-hidden rounded-xl p-0 text-left transition-all duration-200"
    :class="
      active
        ? 'ring-1 ring-pink-400/40 shadow-[0_12px_28px_-10px_rgba(236,72,153,0.4)]'
        : 'hover:border-white/15 hover:shadow-lg hover:shadow-black/40'
    "
    @click="emit('select')">
    <div class="group relative aspect-video overflow-hidden bg-gray-900">
      <img
        v-if="video.cover"
        :src="safeCover(video.cover)"
        referrerpolicy="no-referrer"
        alt="" />
      <div
        v-else
        class="h-full w-full flex items-center justify-center text-gray-600">
        <TvIcon class="size-6" />
      </div>
      <div
        v-if="badge.label"
        class="absolute top-1.5 left-1.5 rounded-sm px-1.5 py-0.5 text-[10px] text-white"
        :class="badge.status === 'completed' ? 'bg-green-600/80' : 'bg-pink-500/85'">
        {{ badge.label }}
      </div>
    </div>
    <div class="flex flex-col gap-1.5 px-3 py-2.5">
      <div class="line-clamp-2 text-xs text-[#d4d4d8] leading-4">{{ video.title }}</div>
      <div class="flex min-w-0 items-center gap-1 text-[11px] text-gray-600">
        <span
          v-if="video.upper.name"
          class="truncate">
          {{ video.upper.name }}
        </span>
        <span v-if="video.upper.name && dateText">·</span>
        <span v-if="dateText">{{ dateText }}</span>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { Tv as TvIcon } from '@lucide/vue'
import { useDownloadStore } from '@renderer/store/download'
import { formatShortDate, safeCover } from '@renderer/utils/media'
import type { FavoriteResource } from '@shared/types'
import { computed } from 'vue'

const props = defineProps<{
  video: FavoriteResource
  active?: boolean
}>()

const emit = defineEmits<{
  (e: 'select'): void
}>()

const downloadStore = useDownloadStore()
const badge = computed(() => downloadStore.videoBadge(props.video.bvid, Number(props.video.page) || 0))
const dateText = computed(() => formatShortDate(props.video.pubtime || props.video.ctime))
</script>
