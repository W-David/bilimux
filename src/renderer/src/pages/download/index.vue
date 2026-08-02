<template>
  <div class="relative h-full flex items-center justify-center overflow-auto">
    <RouterView v-slot="{ Component, route }">
      <Transition
        name="fade"
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

logger.debug('Download index created')
onUnmounted(() => {
  logger.debug('Download index unmounted')
})
</script>
