<template>
  <div class="relative h-full flex flex-col overflow-auto bg-background">
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
