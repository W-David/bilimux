<template>
  <div class="h-full bg-dark-500">
    <div class="h-full flex flex-col justify-between flex-items-center pb-6 pt-14">
      <div class="flex flex-col items-center gap-3">
        <RouterLink
          v-for="item in hItems"
          :key="item.to.name"
          :to="item.to"
          class="h-11 w-11 flex items-center justify-center rounded-2xl transition-all duration-300"
          :class="
            route.name === item.to.name
              ? 'bg-pink/15 text-pink ring-1 ring-pink/20'
              : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
          ">
          <span :class="item.icon"></span>
        </RouterLink>
      </div>
      <div class="flex flex-col items-center gap-3">
        <RouterLink
          v-for="item in fItems"
          :key="item.to.name"
          :to="item.to"
          class="h-11 w-11 flex items-center justify-center rounded-2xl transition-all duration-300"
          :class="
            route.name === item.to.name
              ? 'bg-pink/15 text-pink ring-1 ring-pink/20'
              : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
          ">
          <span :class="item.icon"></span>
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import logger from 'electron-log/renderer'
import { onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const hItems = ref([
  {
    label: '转换',
    icon: 'i-mdi-sync-circle text-2xl',
    to: { name: 'convert' }
  },
  {
    label: '下载',
    icon: 'i-mdi-download text-2xl',
    to: { name: 'download' }
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

<style lang="css" scoped>
.menu-item-enter-from,
.menu-item-leave-to {
  max-height: 0;
}

.menu-item-enter-to,
.menu-item-leave-from {
  max-height: 1000px;
}

.menu-item-leave-active {
  overflow: hidden;
  transition: max-height 0.45s cubic-bezier(0, 1, 0, 1);
}

.menu-item-enter-active {
  overflow: hidden;
  transition: max-height 1s ease-in-out;
}
</style>
