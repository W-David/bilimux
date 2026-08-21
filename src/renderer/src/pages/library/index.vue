<template>
  <div class="h-full w-full overflow-hidden">
    <RouterView v-slot="{ Component, route: currentRoute }">
      <Transition
        :name="route.meta.transition || 'fade'"
        mode="out-in"
        appear>
        <KeepAlive>
          <component
            :is="Component"
            :key="currentRoute.name"></component>
        </KeepAlive>
      </Transition>
    </RouterView>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>
