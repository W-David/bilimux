<template>
  <div class="relative h-full min-h-0">
    <div class="h-full overflow-x-hidden overflow-y-auto px-4 py-4">
      <LibraryGridSkeleton
        v-if="busy && !items.length"
        variant="video"
        :count="8" />
      <div
        v-else-if="!items.length"
        class="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
        <HardDriveIcon class="size-10" />
        <span class="text-sm">{{ emptyCopy }}</span>
        <Button
          size="sm"
          variant="outline"
          :disabled="busy"
          @click="scanAndConvert">
          缓存扫描
        </Button>
      </div>
      <div
        v-else
        class="cache-video-grid">
        <div
          v-if="!visibleItems.length"
          class="col-span-full flex h-64 items-center justify-center text-sm text-gray-500">
          没有符合筛选条件的内容
        </div>
        <CacheCoverCard
          v-for="item in visibleItems"
          :key="item.id"
          :task="item"
          @play="playTask(item)" />
      </div>
    </div>
    <button
      v-if="items.length"
      type="button"
      class="absolute right-4 bottom-4 z-10 flex size-14 cursor-pointer items-center justify-center rounded-full bg-[#2a2a2a] text-gray-200 shadow-lg shadow-black/40 hover:bg-[#333] disabled:pointer-events-none disabled:opacity-60"
      :disabled="busy"
      aria-label="缓存扫描"
      @click="scanAndConvert">
      <RefreshCwIcon
        class="size-6"
        :class="busy ? 'animate-spin' : ''" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { HardDrive as HardDriveIcon, RefreshCcwDot as RefreshCwIcon } from '@lucide/vue'
import CacheCoverCard from '@renderer/components/library/CacheCoverCard.vue'
import LibraryGridSkeleton from '@renderer/components/library/LibraryGridSkeleton.vue'
import { useConvertStore } from '@renderer/store/convert'
import { useLibraryStore } from '@renderer/store/library'
import type { ConvertTask } from '@renderer/types/convert'
import { openLocalPath } from '@renderer/utils/open-file'
import { convertStatusToDownloadFilter, matchesLibraryDownloadFilter } from '@shared/library-filter'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const convertStore = useConvertStore()
const libraryStore = useLibraryStore()
const items = computed(() => convertStore.entireList)
const busy = computed(() => convertStore.runStatus === 'scanning' || convertStore.runStatus === 'processing')
const filter = computed(() => libraryStore.filterFor(route.name))
const visibleItems = computed(() =>
  items.value.filter(item => matchesLibraryDownloadFilter(filter.value, convertStatusToDownloadFilter(item.status)))
)
const emptyCopy = computed(() => (convertStore.hasScanned ? '缓存目录里没有可显示的视频' : '还没有扫描过客户端缓存'))

const scanAndConvert = (): void => {
  void convertStore.scanAndConvert()
}

const playTask = async (task: ConvertTask): Promise<void> => {
  await openLocalPath(task.outputPath || '')
}
</script>
