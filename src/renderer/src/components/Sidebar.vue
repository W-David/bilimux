<template>
  <div class="h-full bg-dark-500">
    <div class="h-full flex flex-col justify-between flex-items-center pb-6 pt-16">
      <div class="flex flex-col items-center gap-4">
        <RouterLink v-for="item in hItems" :key="item.to.name" :to="item.to">
          <span
            :class="[item.icon, route.name === item.to.name ? 'color-[#FB7299]' : 'color-light']"
          ></span>
        </RouterLink>
      </div>
      <div class="flex flex-col items-center gap-4">
        <RouterLink v-for="item in fItems" :key="item.to.name" :to="item.to">
          <span
            :class="[item.icon, route.name === item.to.name ? 'color-[#FB7299]' : 'color-light']"
          ></span>
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
    icon: 'i-mdi-sync-circle text-4xl',
    to: { name: 'convert' }
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
    icon: 'i-mdi-cog text-4xl',
    to: { name: 'settings' }
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
