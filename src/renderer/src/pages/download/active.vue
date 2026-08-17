<template>
  <div class="h-full w-full overflow-y-auto">
    <div
      v-if="downloadStore.activeList.length === 0"
      class="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
      <DownloadIcon class="size-10" />
      <span class="text-sm">暂无下载中的任务</span>
    </div>
    <div
      v-else
      class="flex flex-col gap-3 p-4">
      <DownloadPartItem
        v-for="row in downloadStore.activeList"
        :key="`${row.video.bvid}:${row.page.cid}`"
        :row="row"
        mode="active" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Download as DownloadIcon } from '@lucide/vue'
import DownloadPartItem from '@renderer/components/DownloadPartItem.vue'
import { useDownloadStore } from '@renderer/store/download'

const downloadStore = useDownloadStore()
</script>
