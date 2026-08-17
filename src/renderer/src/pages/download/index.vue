<template>
  <div
    v-if="isAuth"
    class="h-full w-full">
    <RouterView />
  </div>
  <div
    v-else
    class="h-full w-full flex flex-col overflow-hidden">
    <Header>
      <Button
        size="sm"
        variant="outline"
        @click="openDownloadFolder">
        <FolderOpenIcon data-icon="inline-start" />
        下载目录
      </Button>
    </Header>

    <div class="flex items-center justify-between gap-4 border-b border-[#1f1f1f] border-solid p-4">
      <div class="flex items-center gap-3">
        <RouteButton
          v-for="tab in tabs"
          :key="String(tab.name)"
          :to="String(tab.name)" />
      </div>
    </div>

    <div class="min-h-0 flex-1">
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
  </div>
</template>

<script setup lang="ts">
import { FolderOpen as FolderOpenIcon } from '@lucide/vue'
import { openPath } from '@renderer/api'
import Header from '@renderer/components/Header.vue'
import { mittbus } from '@renderer/ipc'
import { getChildTabs } from '@renderer/router/utils'
import { useDownloadStore } from '@renderer/store/download'
import { usePreferenceStore } from '@renderer/store/preference'
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const downloadStore = useDownloadStore()
const preferenceStore = usePreferenceStore()
const route = useRoute()

const isAuth = computed(() => route.name === 'download-auth')
const tabs = computed(() => getChildTabs(route.matched.find(record => record.name === 'download')))

const openDownloadFolder = async (): Promise<void> => {
  const outputDir = preferenceStore.preference['download-config'].outputDir
  const errMessage = await openPath(outputDir)
  if (errMessage) {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: errMessage
    })
  }
}

onMounted(() => {
  void downloadStore.loadHistory()
})
</script>
