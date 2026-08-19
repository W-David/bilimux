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
import { useConvertStore } from '@renderer/store/convert'
import { useDownloadStore } from '@renderer/store/download'
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const downloadStore = useDownloadStore()
const convertStore = useConvertStore()

onMounted(() => {
  void downloadStore.loadHistory()
  void convertStore.loadHistory()
})
</script>
