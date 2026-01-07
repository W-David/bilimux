<script setup lang="ts">
import logger from 'electron-log/renderer'
import { onUnmounted } from 'vue'
import Sidebar from './Sidebar.vue'
import UpdateNotification from './UpdateNotification.vue'
logger.debug('Layout created')
onUnmounted(() => {
  logger.debug('Layout unmounted')
})
</script>

<template>
  <div class="h-full w-full">
    <UpdateNotification />
    <div
      class="grid grid-cols-[82px_1fr] h-full w-full"
      :style="{ 'grid-template-columns': '--sidebar-width 1fr' }">
      <div class="h-full overflow-hidden">
        <Sidebar></Sidebar>
      </div>
      <div class="h-full overflow-y-auto">
        <RouterView></RouterView>
      </div>
    </div>
  </div>
</template>
