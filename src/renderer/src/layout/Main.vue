<template>
  <div class="relative h-full min-h-0 flex flex-col overflow-x-hidden overflow-y-auto bg-background">
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
import { KeepAlive } from 'vue'
</script>
