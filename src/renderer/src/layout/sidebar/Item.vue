<template>
  <RouterLink
    :to="to"
    :draggable="false"
    class="h-11 w-11 flex select-none items-center justify-center rounded-xl transition-all duration-300"
    :class="
      isActive ? 'bg-pink/15 text-pink ring-1 ring-pink/20' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
    ">
    <span :class="icon"></span>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

interface SidebarItemProps {
  to: {
    name: string
    activeMenu?: string
  }
  icon: string
  label?: string
}

const props = defineProps<SidebarItemProps>()
const route = useRoute()

// 判断当前路由是否匹配
const isActive = computed(() => {
  if (route.meta.activeMenu) {
    return route.meta.activeMenu === props.to.activeMenu
  }
  return route.name === props.to.name
})
</script>
