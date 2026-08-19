<script setup lang="ts">
import LoginDialog from '@renderer/components/LoginDialog.vue'
import Update from '@renderer/components/Update.vue'
import UserProfileDialog from '@renderer/components/UserProfileDialog.vue'
import Headbar from './headbar/index.vue'
import Sidebar from './sidebar/index.vue'
</script>

<template>
  <div class="h-full w-full">
    <Update />
    <LoginDialog />
    <UserProfileDialog />
    <div
      class="grid h-full w-full"
      :style="{ 'grid-template-columns': 'var(--sidebar-width) 1fr' }">
      <div class="h-full overflow-hidden">
        <Sidebar></Sidebar>
      </div>
      <div class="flex h-full min-w-0 flex-col overflow-hidden">
        <Headbar />
        <div class="min-h-0 flex-1 overflow-y-auto">
          <RouterView></RouterView>
        </div>
      </div>
    </div>
  </div>
</template>
