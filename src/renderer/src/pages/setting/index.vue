<template>
  <div class="mx-auto h-full w-full flex flex-col gap-4 pt-4 text-sm">
    <!-- 标题 -->
    <div class="px-6">
      <div class="text-base font-black">设置</div>
    </div>

    <!-- 自绘切换按钮 -->
    <div class="flex items-center gap-3 px-6">
      <div
        v-for="tab in tabs"
        :key="tab.name"
        type="button"
        :class="[
          'relative flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[16px] border border-black/5 bg-[#121212] px-5 text-sm shadow-sm shadow-black/50 transition-all duration-300 text-zinc-400 hover:bg-[#202020] hover:text-white',
          route.name === tab.name ? 'border-pink-500/30 bg-pink-500/20 text-pink-400' : ''
        ]"
        @click="switchTab(tab.name)">
        <component
          :is="tab.icon"
          class="size-4" />
        <span>{{ tab.label }}</span>
      </div>
    </div>

    <!-- 分组视图（KeepAlive 缓存） -->
    <div class="min-h-0 flex-1 overflow-y-auto px-6">
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

    <!-- 底部操作栏 -->
    <div class="h-15 w-full shrink-0 bg-transparent pl-4 shadow backdrop-blur">
      <div class="h-full w-full flex justify-end gap-4 p-3">
        <Button
          size="sm"
          variant="ghost"
          @click="clear">
          重置
        </Button>
        <Button
          size="sm"
          @click="save">
          <SaveIcon data-icon="inline-start" />
          保存
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Download as DownloadIcon,
  Film as FilmIcon,
  Save as SaveIcon,
  Settings as SettingsIcon,
  User as UserIcon
} from '@lucide/vue'
import { clearNativeStore, subscribeFetchPreferenceEvent } from '@renderer/api'
import { mittbus } from '@renderer/ipc'
import { usePreferenceStore } from '@renderer/store/preference'
import logger from 'electron-log/renderer'
import { onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const store = usePreferenceStore()
const { fetchPreference, savePreference } = store
const route = useRoute()
const router = useRouter()

const tabs = [
  { name: 'prefer-normal', label: '常规设置', icon: SettingsIcon },
  { name: 'prefer-user', label: '用户设置', icon: UserIcon },
  { name: 'prefer-convert', label: '视频转换', icon: FilmIcon },
  { name: 'prefer-download', label: '视频下载', icon: DownloadIcon }
]

const switchTab = (name: string): void => {
  if (route.name === name) {
    return
  }
  router.push({ name })
}

const subscribe = subscribeFetchPreferenceEvent(async () => {
  try {
    await fetchPreference()
    mittbus.emit('toast:add', {
      severity: 'success',
      message: '已更新配置'
    })
  } catch (error) {
    logger.error(error)
    mittbus.emit('toast:add', {
      severity: 'error',
      message: error instanceof Error ? error.message : String(error)
    })
  }
})

const save = async (): Promise<void> => {
  savePreference()
}

const clear = (): void => {
  clearNativeStore()
}

logger.debug('Setting created')

onUnmounted(() => {
  subscribe()
  logger.debug('Setting unmounted')
})
</script>

<style scoped></style>
