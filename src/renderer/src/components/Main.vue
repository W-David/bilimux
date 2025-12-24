<template>
  <div class="h-full flex flex-col overflow-auto bg-dark-800">
    <RouterView v-slot="{ Component, route }">
      <Transition :name="route.meta.transition" mode="out-in" appear>
        <KeepAlive>
          <component :is="Component" :key="route.name"></component>
        </KeepAlive>
      </Transition>
    </RouterView>
  </div>
</template>

<script setup lang="ts">
import logger from 'electron-log/renderer'
import { KeepAlive, onUnmounted } from 'vue'

logger.debug('Main created')
onUnmounted(() => {
  logger.debug('Main unmounted')
})
</script>

<style lang="css" scoped>
.slide-down-enter-active,
.slide-up-enter-active {
  transition: all 0.3s ease-out;
}

.slide-down-leave-active,
.slide-up-leave-active {
  transition: all 0.2s ease-in;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-200px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(200px);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(200px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-200px);
}
</style>
