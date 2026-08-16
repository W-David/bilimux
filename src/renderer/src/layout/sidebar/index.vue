<template>
  <div class="h-full bg-[#1f1f1f]">
    <div class="h-full flex flex-col justify-between items-center pb-6 pt-14">
      <div class="flex flex-col items-center gap-3">
        <SidebarItem
          v-for="item in startItems"
          :key="String(item.name)"
          :to="String(item.name)" />
      </div>
      <div class="flex flex-col items-center gap-3">
        <SidebarItem
          v-for="item in endItems"
          :key="String(item.name)"
          :to="String(item.name)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getChildMenus } from '@renderer/router/utils'
import { useRouter } from 'vue-router'
import SidebarItem from './Item.vue'

const router = useRouter()
const main = router.getRoutes().find(record => record.name === 'main')
const menus = getChildMenus(main)
// 路由表顺序：转换、下载、关于、设置。侧栏自己切成上下两区。
const startItems = menus.slice(0, -2)
const endItems = menus.slice(-2)
</script>

<style lang="css" scoped></style>
