<template>
  <button
    type="button"
    class="flex w-full cursor-pointer flex-col gap-2 p-2 text-left rounded-lg"
    @click="emit('select')">
    <div
      class="relative aspect-video overflow-hidden rounded-lg bg-gray-900"
      :class="selected ? 'outline-2 outline-offset-2 outline-pink-400' : ''">
      <img
        v-if="video.cover"
        :src="safeCover(video.cover)"
        referrerpolicy="no-referrer"
        class="h-full w-full object-cover"
        alt="" />
      <div
        v-else
        class="h-full w-full flex items-center justify-center text-gray-600">
        <TvIcon class="size-8" />
      </div>
      <div
        v-if="badge.label"
        class="absolute top-1.5 left-1.5 rounded-sm px-1.5 py-0.5 text-[10px] text-white"
        :class="badge.status === 'completed' ? 'bg-green-600/80' : 'bg-pink-500/85'">
        {{ badge.label }}
      </div>
      <div
        class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-linear-to-t from-black/70 to-transparent px-1.5 pb-1.5 pt-6 text-[10px] text-white/90">
        <span class="flex min-w-0 items-center gap-2">
          <span v-if="playText">▶ {{ playText }}</span>
          <span v-if="danmakuText">💬 {{ danmakuText }}</span>
        </span>
        <span v-if="video.duration">{{ formatDuration(video.duration) }}</span>
      </div>
    </div>
    <div class="min-w-0 px-0.5">
      <div
        class="line-clamp-2 text-xs leading-5"
        :class="selected ? 'text-pink-300' : 'text-zinc'">
        {{ video.title }}
      </div>
      <div class="mt-1 flex items-center gap-1 text-xs text-gray-500">
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
import { formatCount, formatDuration, formatShortDate, safeCover } from '@renderer/utils/media'
import type { FavoriteResource } from '@shared/types'
import { computed } from 'vue'

const props = defineProps<{
  video: FavoriteResource
  selected?: boolean
}>()

const emit = defineEmits<{
  (e: 'select'): void
}>()

const downloadStore = useDownloadStore()
const badge = computed(() => downloadStore.videoBadge(props.video.bvid, Number(props.video.page) || 0))
const playText = computed(() => formatCount(props.video.cnt_info?.play))
const danmakuText = computed(() => formatCount(props.video.cnt_info?.danmaku))
const dateText = computed(() => formatShortDate(props.video.pubtime || props.video.ctime))
</script>
