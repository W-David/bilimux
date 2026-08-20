<template>
  <div class="relative h-full min-h-0">
    <div class="h-full overflow-y-auto px-4 py-4">
      <LibraryGridSkeleton
        v-if="busy && !items.length"
        variant="video"
        :count="8" />
      <div
        v-else-if="!items.length"
        class="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
        <HardDriveIcon class="size-10" />
        <span class="text-sm">还没有扫描过客户端缓存</span>
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
        <CacheCoverCard
          v-for="item in items"
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
import { openPath } from '@renderer/api'
import CacheCoverCard from '@renderer/components/library/CacheCoverCard.vue'
import LibraryGridSkeleton from '@renderer/components/library/LibraryGridSkeleton.vue'
import { mittbus } from '@renderer/ipc'
import { useConvertStore } from '@renderer/store/convert'
import type { ConvertTask } from '@renderer/types/convert'
import { computed } from 'vue'

const convertStore = useConvertStore()
const items = computed(() => convertStore.entireList)
const busy = computed(() => convertStore.runStatus === 'scanning' || convertStore.runStatus === 'processing')

const scanAndConvert = (): void => {
  void convertStore.scanAndConvert()
}

const playTask = async (task: ConvertTask): Promise<void> => {
  if (!task.outputPath) return
  const errMessage = await openPath(task.outputPath)
  if (errMessage) {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: errMessage
    })
  }
}
</script>
