<template>
  <div class="h-full w-full flex flex-col overflow-hidden">
    <!-- 顶部：标题 + 状态切换 -->

    <Header>
      <Button
        size="sm"
        variant="outline"
        @click="openOutputFolder">
        <FolderOpenIcon data-icon="inline-start" />
        输出目录
      </Button>
    </Header>

    <!-- 操作栏 -->
    <div class="flex items-center justify-between gap-4 border-b border-[#1f1f1f] border-solid p-4">
      <!-- 状态切换按钮 -->
      <div class="flex items-center gap-3">
        <RouteButton
          v-for="tab in tabs"
          :key="String(tab.name)"
          :to="String(tab.name)" />
      </div>
      <div class="flex items-center justify-end gap-2">
        <div class="flex flex-none items-center gap-2">
          <div
            role="button"
            tabindex="0"
            class="flex h-8 cursor-pointer select-none items-center justify-center gap-2 rounded-2xl bg-gray-400/15 px-3 font-bold text-gray-400 ring-1 ring-gray-300/20 transition-all duration-300 hover:bg-pink-400/25 hover:text-pink-400 hover:ring-pink-300/20"
            :class="busy ? 'pointer-events-none opacity-50' : ''"
            @click="convertStore.prescan()"
            @keydown.enter="convertStore.prescan()">
            <SearchIcon
              class="size-5"
              :class="{ 'animate-spin': convertStore.runStatus === 'scanning' }" />
            <span>{{ convertStore.runStatus === 'scanning' ? '缓存扫描中' : '缓存扫描' }}</span>
          </div>
          <div
            role="button"
            tabindex="0"
            class="flex h-8 cursor-pointer select-none items-center justify-center gap-2 rounded-2xl bg-gray-400/15 px-3 font-bold text-gray-400 ring-1 ring-gray-300/20 transition-all duration-300 hover:bg-pink-400/25 hover:text-pink-400 hover:ring-pink-300/20"
            :class="busy ? 'pointer-events-none opacity-50' : ''"
            @click="convertStore.start()"
            @keydown.enter="convertStore.start()">
            <component
              :is="runButtonState.icon"
              class="size-5"
              :class="{ 'animate-spin': runButtonState.spinning }" />
            <span>{{ runButtonState.label }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 分组视图（KeepAlive 缓存） -->
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
import {
  FolderOpen as FolderOpenIcon,
  Loader2 as Loader2Icon,
  Play as PlayIcon,
  Search as SearchIcon
} from '@lucide/vue'
import { openPath } from '@renderer/api'
import Header from '@renderer/components/Header.vue'
import { mittbus } from '@renderer/ipc'
import { getChildTabs } from '@renderer/router/utils'
import { useConvertStore } from '@renderer/store/convert'
import { usePreferenceStore } from '@renderer/store/preference'
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const convertStore = useConvertStore()
const preferenceStore = usePreferenceStore()
const route = useRoute()

const busy = computed(() => convertStore.runStatus === 'scanning' || convertStore.runStatus === 'processing')

/** 运行按钮状态回显 */
const runButtonState = computed(() => {
  switch (convertStore.runStatus) {
    case 'processing':
      return { icon: Loader2Icon, label: '运行中', spinning: true }
    default:
      return { icon: PlayIcon, label: '开始转换', spinning: false }
  }
})

const tabs = computed(() => getChildTabs(route.matched.find(record => record.name === 'convert')))

const openOutputFolder = async (): Promise<void> => {
  const outputDir = preferenceStore.preference['convert-config'].outputDir
  const errMessage = await openPath(outputDir)
  if (errMessage) {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: errMessage
    })
  }
}

onMounted(() => {
  convertStore.loadHistory()
})
</script>

<style scoped></style>
