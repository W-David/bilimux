<template>
  <div class="h-full w-full flex flex-col overflow-hidden">
    <!-- 顶部：标题 + 状态切换 -->
    <div class="flex items-center justify-between gap-4 border-b border-[#1f1f1f] border-solid p-4">
      <div class="min-w-0 flex items-center gap-3">
        <img
          src="../../assets/bilimux.svg"
          alt="BiliMux"
          class="h-10 w-10" />
        <div class="flex items-center">
          <div class="text-base font-black">客户端缓存视频转 MP4</div>
        </div>
      </div>
      <div class="flex flex-none items-center gap-2">
        <Button
          size="sm"
          class="bg-gray-400/5 text-gray-400"
          @click="openOutputFolder">
          <FolderOpenIcon data-icon="inline-start" />
          输出目录
        </Button>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="flex items-center justify-between gap-4 border-b border-[#1f1f1f] border-solid p-4">
      <!-- 状态切换按钮 -->
      <div class="flex items-center gap-3">
        <div
          v-for="tab in tabs"
          :key="tab.name"
          type="button"
          :class="[
            'relative h-8 w-24 flex cursor-pointer items-center justify-center gap-2 rounded-2xl text-sm border border-black/5 bg-[#121212] shadow-sm shadow-black/50 hover:bg-[#202020] transition-all duration-300 text-zinc-400 hover:text-white',
            route.name === tab.name ? tab.activeClass : tab.inactiveClass
          ]"
          @click="switchTab(tab.name)">
          <component
            :is="tab.icon"
            class="size-4" />
          <span>{{ tab.label }}</span>
          <span
            class="absolute right-0 z-10 h-3 min-w-8 flex items-center justify-center border border-black/20 rounded-sm border-solid bg-[#222222] px-0.75 text-[8px] text-white shadow-[#222222] shadow-sm -top-2">
            <span class="mx-0.75">{{ convertStore.counts[tab.countKey] }}</span>
          </span>
        </div>
      </div>
      <div class="flex items-center justify-end gap-2">
        <div class="flex flex-none items-center gap-2">
          <div
            role="button"
            tabindex="0"
            class="flex h-8 cursor-pointer select-none items-center justify-center gap-2 rounded-2xl bg-gray-400/15 px-3 text-base font-bold text-gray-400 ring-1 ring-gray-400/20 transition-all duration-300 hover:bg-pink-400/25 hover:text-pink-300 active:scale-95 hover:ring-pink-400/20"
            :class="
              convertStore.runStatus === 'scanning' || convertStore.runStatus === 'processing'
                ? 'pointer-events-none opacity-50'
                : ''
            "
            @click="convertStore.start()">
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
  CircleCheck as CircleCheckIcon,
  CircleX as CircleXIcon,
  FolderOpen as FolderOpenIcon,
  List as ListIcon,
  Loader2 as Loader2Icon,
  Play as PlayIcon,
  Search as SearchIcon
} from '@lucide/vue'
import { openPath } from '@renderer/api'
import { mittbus } from '@renderer/ipc'
import { useConvertStore } from '@renderer/store/convert'
import { usePreferenceStore } from '@renderer/store/preference'
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const convertStore = useConvertStore()
const preferenceStore = usePreferenceStore()
const route = useRoute()
const router = useRouter()

/** 运行按钮状态回显 */
const runButtonState = computed(() => {
  switch (convertStore.runStatus) {
    case 'scanning':
      return { icon: SearchIcon, label: '扫描中', spinning: false }
    case 'processing':
      return { icon: Loader2Icon, label: '运行中', spinning: true }
    default:
      return { icon: PlayIcon, label: 'Run', spinning: false }
  }
})

const tabs = [
  {
    name: 'convert-entire',
    label: '全部任务',
    icon: ListIcon,
    countKey: 'entire',
    activeClass: 'bg-violet-500 !text-white',
    inactiveClass: ''
  },
  {
    name: 'convert-complete',
    label: '已完成',
    icon: CircleCheckIcon,
    countKey: 'completed',
    activeClass: 'bg-emerald-600 !text-white',
    inactiveClass: ''
  },
  {
    name: 'convert-unconverted',
    label: '未完成',
    icon: CircleXIcon,
    countKey: 'unconverted',
    activeClass: 'bg-rose-400 !text-white',
    inactiveClass: ''
  }
] as const

const switchTab = (name: string): void => {
  if (route.name === name) {
    return
  }
  router.push({ name })
}

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
