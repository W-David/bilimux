<template>
  <div class="h-full bg-[#1f1f1f]">
    <div class="h-full flex flex-col justify-between items-center pb-6 pt-14">
      <div class="flex flex-col items-center gap-3">
        <SidebarItem
          v-for="item in hItems"
          :key="item.to.name"
          :to="item.to"
          :icon="item.icon"
          :label="item.label" />
      </div>
      <div class="flex flex-col items-center gap-3">
        <SidebarItem
          v-for="item in fItems"
          :key="item.to.name"
          :to="item.to"
          :icon="item.icon"
          :label="item.label" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import logger from 'electron-log/renderer'
import { onUnmounted, ref } from 'vue'
import SidebarItem from './Item.vue'

const hItems = ref([
  {
    label: '转换',
    icon: 'i-mdi-sync-circle text-2xl',
    to: { name: 'convert' }
  },
  {
    label: '转换管理',
    icon: 'i-mdi-format-list-bulleted text-2xl',
    to: { name: 'convert-manager', activeMenu: 'convert-manager' }
  },
  {
    label: '下载',
    icon: 'i-mdi-download text-2xl',
    to: { name: 'download-task', activeMenu: 'download' }
  }
])

const fItems = ref([
  {
    label: '关于',
    icon: 'i-mdi-information text-2xl',
    to: { name: 'about' }
  },
  {
    label: '设置',
    icon: 'i-mdi-cog text-2xl',
    to: { name: 'prefer' }
  }
])

logger.debug('Sidebar created')

onUnmounted(() => {
  logger.debug('Sidebar unmounted')
})
</script>

<style lang="css" scoped></style>
