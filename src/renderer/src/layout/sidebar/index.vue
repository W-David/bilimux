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
import { Download as DownloadIcon, Info as InfoIcon, List as ListIcon, Settings as SettingsIcon } from '@lucide/vue'
import { ref } from 'vue'
import SidebarItem from './Item.vue'

const hItems = ref([
  {
    label: '转换管理',
    icon: ListIcon,
    to: { name: 'convert', activeMenu: 'convert' }
  },
  {
    label: '下载',
    icon: DownloadIcon,
    to: { name: 'download', activeMenu: 'download' }
  }
])

const fItems = ref([
  {
    label: '关于',
    icon: InfoIcon,
    to: { name: 'about' }
  },
  {
    label: '设置',
    icon: SettingsIcon,
    to: { name: 'prefer', activeMenu: 'prefer' }
  }
])
</script>

<style lang="css" scoped></style>
