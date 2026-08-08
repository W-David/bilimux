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
          <div class="text-base font-black">视频转换</div>
        </div>
      </div>
      <div class="flex flex-none items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          :disabled="convertStore.runStatus === 'scanning' || convertStore.runStatus === 'processing'"
          class="bg-red-400/5 text-red-400"
          @click="showClearDialog = true">
          <Trash2Icon data-icon="inline-start" />
          清空历史
        </Button>
        <Button
          size="sm"
          variant="ghost"
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
            'relative h-8 w-24 flex cursor-pointer items-center justify-center gap-2 rounded-[16px] text-sm border border-black/5 bg-[#121212] shadow-sm shadow-black/50 hover:bg-[#202020] transition-all duration-300 text-zinc-400 hover:text-white',
            route.name === tab.name ? tab.activeClass : tab.inactiveClass
          ]"
          @click="switchTab(tab.name)">
          <component
            :is="tab.icon"
            class="size-4" />
          <span>{{ tab.label }}</span>
          <span
            class="absolute right-0 z-10 h-[12px] min-w-8 flex items-center justify-center border border border-black/20 rounded-[6px] border-solid bg-[#222222] px-[3px] text-[8px] text-white shadow-[#222222] shadow-sm -top-2">
            <span class="mx-[3px]">{{ convertStore.counts[tab.countKey] }}</span>
          </span>
        </div>
      </div>
      <div class="flex items-center justify-end gap-2">
        <div class="flex flex-none items-center gap-2">
          <Button
            size="sm"
            :disabled="convertStore.runStatus === 'scanning' || convertStore.runStatus === 'processing'"
            @click="convertStore.start()">
            <PlayIcon data-icon="inline-start" />
            开始转换
          </Button>
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

    <!-- 清空历史确认弹窗 -->
    <AlertDialog v-model:open="showClearDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>清空转换历史</AlertDialogTitle>
          <AlertDialogDescription>确定要清空全部转换历史吗？此操作不可恢复。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction @click="handleClearHistory">清空</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import {
  CircleCheck as CircleCheckIcon,
  CircleX as CircleXIcon,
  FolderOpen as FolderOpenIcon,
  List as ListIcon,
  Play as PlayIcon,
  Trash2 as Trash2Icon
} from '@lucide/vue'
import { openPath } from '@renderer/api'
import { mittbus } from '@renderer/ipc'
import { useConvertStore } from '@renderer/store/convert'
import { usePreferenceStore } from '@renderer/store/preference'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const convertStore = useConvertStore()
const preferenceStore = usePreferenceStore()
const route = useRoute()
const router = useRouter()

const showClearDialog = ref(false)

const tabs = [
  {
    name: 'convert-manager-entire',
    label: '全部任务',
    icon: ListIcon,
    countKey: 'entire',
    activeClass: 'bg-violet-500 !text-white',
    inactiveClass: ''
  },
  {
    name: 'convert-manager-complete',
    label: '已完成',
    icon: CircleCheckIcon,
    countKey: 'completed',
    activeClass: 'bg-emerald-600 !text-white',
    inactiveClass: ''
  },
  {
    name: 'convert-manager-unconverted',
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

const handleClearHistory = async (): Promise<void> => {
  showClearDialog.value = false
  try {
    await convertStore.clearHistory()
    mittbus.emit('toast:add', {
      severity: 'success',
      message: '转换历史已清空'
    })
  } catch (error) {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: error instanceof Error ? error.message : String(error)
    })
  }
}

onMounted(() => {
  convertStore.loadHistory()
})
</script>

<style scoped></style>
