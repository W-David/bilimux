<template>
  <div class="mx-auto h-full w-full flex flex-col text-sm">
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
    <div
      v-if="route.name !== 'prefer-about'"
      class="h-15 w-full shrink-0 bg-transparent pl-4 shadow backdrop-blur">
      <div class="h-full w-full flex justify-end gap-4 p-3">
        <Button
          size="sm"
          variant="ghost"
          @click="showResetDialog = true">
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

    <!-- 重置确认弹窗 -->
    <AlertDialog v-model:open="showResetDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>重置所有设置</AlertDialogTitle>
          <AlertDialogDescription>
            <div class="flex flex-col gap-1">
              <span>将重置：所有设置、登录信息。</span>
              <span>不会删除：已下载的视频文件、下载历史、转换历史。</span>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction @click="clear">重置</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { Save as SaveIcon } from '@lucide/vue'
import { clearNativeStore, subscribeFetchPreferenceEvent } from '@renderer/api'
import { mittbus } from '@renderer/ipc'
import { useAuthStore } from '@renderer/store/auth'
import { usePreferenceStore } from '@renderer/store/preference'
import logger from 'electron-log/renderer'
import { onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const store = usePreferenceStore()
const { fetchPreference, savePreference } = store
const authStore = useAuthStore()
const route = useRoute()

const showResetDialog = ref(false)

const subscribe = subscribeFetchPreferenceEvent(async () => {
  try {
    await fetchPreference()
  } catch (error) {
    logger.error(error)
    mittbus.emit('toast:add', {
      severity: 'error',
      message: error instanceof Error ? error.message : String(error)
    })
  }
})

const save = (): void => {
  savePreference()
  mittbus.emit('toast:add', {
    severity: 'success',
    message: '设置已保存'
  })
}

const clear = (): void => {
  showResetDialog.value = false
  authStore.isAuthenticated = false
  clearNativeStore()
}

onUnmounted(() => {
  subscribe()
})
</script>

<style scoped></style>
