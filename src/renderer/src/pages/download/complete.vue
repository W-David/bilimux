<template>
  <div class="h-full w-full overflow-y-auto">
    <div
      v-if="downloadStore.completedList.length === 0"
      class="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
      <CircleCheckIcon class="size-10" />
      <span class="text-sm">暂无已完成的任务</span>
    </div>
    <div
      v-else
      class="flex flex-col gap-3 p-4">
      <DownloadPartItem
        v-for="row in downloadStore.completedList"
        :key="`${row.video.bvid}:${row.page.cid}`"
        :row="row"
        mode="complete" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CircleCheck as CircleCheckIcon } from '@lucide/vue'
import DownloadPartItem from '@renderer/components/DownloadPartItem.vue'
import { useDownloadStore } from '@renderer/store/download'

const downloadStore = useDownloadStore()
</script>
