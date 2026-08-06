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
            :key="route.matched[2]?.path ?? route.path"></component>
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
