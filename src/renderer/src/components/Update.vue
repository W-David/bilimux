<script setup lang="ts">
import { useUpdateStore } from '@renderer/store/update'
import { storeToRefs } from 'pinia'
import { onMounted, onUnmounted } from 'vue'

const updateStore = useUpdateStore()
const { updateAvailable, updateDownloaded, downloading, downloadProgress } = storeToRefs(updateStore)
const { startDownload, quitAndInstall, init, destroy } = updateStore

onMounted(() => {
  init()
})

onUnmounted(() => {
  destroy()
})
</script>

<template>
  <div
    v-if="updateAvailable"
    class="fixed right-4 top-4 z-50 h-8 w-25 select-none">
    <div
      class="relative h-full w-full cursor-pointer overflow-hidden backdrop-blur"
      :class="{ 'bg-transparent pointer-events-none': downloading }"
      ring="~ 1 pink/40"
      hover="ring-pink"
      text="sm pink"
      transition="~ all 300 ease"
      flex="~ justify-center items-center gap-2"
      bg="pink/10"
      border="rounded-full">
      <div
        v-if="downloading"
        class="absolute bottom-0 left-0 top-0 bg-pink/30"
        :style="{ width: `${downloadProgress}%` }"></div>

      <div
        v-if="downloading"
        class="text-light">
        <span>下载中</span>
      </div>

      <div v-else>
        <span
          v-if="updateDownloaded"
          @click="quitAndInstall">
          重启安装
        </span>

        <span
          v-else
          @click="startDownload">
          新版本可用
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Add any specific animations or transitions if needed */
</style>
