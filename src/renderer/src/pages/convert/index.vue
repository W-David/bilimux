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
          label="清空历史"
          icon="i-mdi-trash-can-outline"
          size="small"
          variant="text"
          :disabled="convertStore.runStatus === 'scanning' || convertStore.runStatus === 'processing'"
          class="bg-red-400/5 text-red"
          @click="showClearDialog = true"></Button>
        <Button
          label="输出目录"
          icon="i-mdi-folder-open"
          size="small"
          variant="text"
          class="bg-gray-400/5 text-gray-400"
          @click="openOutputFolder"></Button>
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
          <i :class="tab.icon"></i>
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
            label="开始转换"
            icon="i-mdi-play"
            size="small"
            :disabled="convertStore.runStatus === 'scanning' || convertStore.runStatus === 'processing'"
            @click="convertStore.start()"></Button>
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
    <Dialog
      v-model:visible="showClearDialog"
      modal
      header="清空转换历史"
      :style="{ width: '420px', maxWidth: '90vw' }">
      <p class="text-sm text-gray-300">确定要清空全部转换历史吗？此操作不可恢复。</p>
      <template #footer>
        <Button
          label="取消"
          severity="secondary"
          size="small"
          variant="text"
          @click="showClearDialog = false"></Button>
        <Button
          label="清空"
          severity="danger"
          size="small"
          @click="handleClearHistory"></Button>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
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
    icon: 'i-mdi-view-list-outline',
    countKey: 'entire',
    activeClass: 'bg-violet-500 !text-white',
    inactiveClass: ''
  },
  {
    name: 'convert-manager-complete',
    label: '已完成',
    icon: 'i-mdi-check-circle-outline',
    countKey: 'completed',
    activeClass: 'bg-emerald-600 !text-white',
    inactiveClass: ''
  },
  {
    name: 'convert-manager-unconverted',
    label: '未完成',
    icon: 'i-mdi-close-circle-outline',
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
      summary: '错误',
      detail: errMessage,
      life: 3000
    })
  }
}

const handleClearHistory = async (): Promise<void> => {
  showClearDialog.value = false
  try {
    await convertStore.clearHistory()
    mittbus.emit('toast:add', {
      severity: 'success',
      summary: '成功',
      detail: '转换历史已清空',
      closable: false,
      life: 2000
    })
  } catch (error) {
    mittbus.emit('toast:add', {
      severity: 'error',
      summary: '清空失败',
      detail: error instanceof Error ? error.message : String(error),
      closable: false,
      life: 3000
    })
  }
}

onMounted(() => {
  convertStore.loadHistory()
})
</script>

<style scoped></style>
