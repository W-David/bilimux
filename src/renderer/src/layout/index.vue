<script setup lang="ts">
import Update from '@renderer/components/Update.vue'
import Sidebar from './sidebar/index.vue'
</script>

<template>
  <div class="h-full w-full">
    <Update />
    <div
      class="grid grid-cols-[82px_1fr] h-full w-full"
      :style="{ 'grid-template-columns': 'var(--sidebar-width) 1fr' }">
      <div class="h-full overflow-hidden">
        <Sidebar></Sidebar>
      </div>
      <div class="h-full overflow-y-auto">
        <RouterView></RouterView>
      </div>
    </div>
  </div>
</template>
