<template>
  <div class="mx-auto h-full w-full flex flex-col gap-4 text-sm">
    <Header></Header>

    <!-- 自绘切换按钮 -->
    <div class="flex items-center gap-3 px-6">
      <RouteButton
        v-for="tab in tabs"
        :key="String(tab.name)"
        :to="String(tab.name)" />
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
          :disabled="favoritesStore.running"
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
              <span>将重置：所有设置、登录信息、收藏夹缓存。</span>
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
import Header from '@renderer/components/Header.vue'
import { mittbus } from '@renderer/ipc'
import { getChildTabs } from '@renderer/router/utils'
import { useAuthStore } from '@renderer/store/auth'
import { useFavoritesStore } from '@renderer/store/favorites'
import { usePreferenceStore } from '@renderer/store/preference'
import logger from 'electron-log/renderer'
import { computed, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const store = usePreferenceStore()
const { fetchPreference, savePreference } = store
const authStore = useAuthStore()
const favoritesStore = useFavoritesStore()
const route = useRoute()

const showResetDialog = ref(false)

const tabs = computed(() => getChildTabs(route.matched.find(record => record.name === 'prefer')))

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
  void authStore.leaveProtectedRoute()
}

onUnmounted(() => {
  subscribe()
})
</script>

<style scoped></style>
