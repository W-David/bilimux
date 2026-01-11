<template>
  <div class="relative h-full flex flex-col overflow-auto bg-dark-800">
    <RouterView v-slot="{ Component, route }">
      <Transition
        :name="route.meta.transition"
        mode="out-in"
        appear>
        <KeepAlive>
          <component
            :is="Component"
            :key="route.name"></component>
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
.main-slide-down-enter-active,
.main-slide-up-enter-active {
  transition: all 0.3s ease-out;
}

.main-slide-down-leave-active,
.main-slide-up-leave-active {
  transition: all 0.3s ease-in;
}

.main-slide-down-enter-from {
  opacity: 0;
  transform: translateY(-200px);
}

.main-slide-down-leave-to {
  opacity: 0;
  transform: translateY(200px);
}

.main-slide-up-enter-from {
  opacity: 0;
  transform: translateY(200px);
}

.main-slide-up-leave-to {
  opacity: 0;
  transform: translateY(-200px);
}
</style>
