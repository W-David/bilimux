<template>
  <Dialog
    :open="authStore.profileOpen"
    @update:open="onOpenChange">
    <DialogContent class="w-88 gap-0 overflow-hidden p-0">
      <DialogHeader class="sr-only">
        <DialogTitle>用户信息</DialogTitle>
        <DialogDescription>查看账号信息，刷新或退出登录</DialogDescription>
      </DialogHeader>

      <div class="px-5 pb-4 pt-8">
        <UserCard
          v-if="currentUserInfo"
          :user="currentUserInfo" />
        <div
          v-else
          class="py-2 text-center text-sm text-gray-400">
          尚未登录
        </div>
      </div>

      <Separator class="bg-[#1f1f1f]" />

      <div class="flex flex-col p-2">
        <button
          type="button"
          class="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm text-gray-200 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="refreshingUserInfo || !currentUserInfo"
          @click="refreshUserInfo">
          <span>刷新用户信息</span>
          <Spinner
            v-if="refreshingUserInfo"
            class="size-4 text-pink-400" />
          <RefreshCwIcon
            v-else
            class="size-4 text-gray-400" />
        </button>
        <button
          type="button"
          class="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!currentUserInfo || loggingOut"
          @click="showLogoutDialog = true">
          <span>退出登录</span>
          <Spinner
            v-if="loggingOut"
            class="size-4" />
          <LogOutIcon
            v-else
            class="size-4" />
        </button>
      </div>
    </DialogContent>
  </Dialog>

  <AlertDialog v-model:open="showLogoutDialog">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>退出登录</AlertDialogTitle>
        <AlertDialogDescription>确定要退出当前账号吗？退出后将清除本地保存的登录信息。</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="loggingOut">取消</AlertDialogCancel>
        <AlertDialogAction
          :disabled="loggingOut"
          @click="handleLogout">
          <Spinner
            v-if="loggingOut"
            data-icon="inline-start" />
          退出登录
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<script setup lang="ts">
import { LogOut as LogOutIcon, RefreshCw as RefreshCwIcon } from '@lucide/vue'
import UserCard from '@renderer/components/UserCard.vue'
import { mittbus } from '@renderer/ipc'
import { fetchCurrentUserInfo } from '@renderer/services/user'
import { useAuthStore } from '@renderer/store/auth'
import { usePreferenceStore } from '@renderer/store/preference'
import logger from 'electron-log/renderer'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'

const store = usePreferenceStore()
const { preference } = storeToRefs(store)
const { savePreference } = store
const authStore = useAuthStore()

const refreshingUserInfo = ref(false)
const loggingOut = ref(false)
const showLogoutDialog = ref(false)
const currentUserInfo = computed(() => preference.value['user-info'] ?? null)

const onOpenChange = (open: boolean): void => {
  if (open) authStore.openProfile()
  else authStore.closeProfile()
}

const refreshUserInfo = async (): Promise<void> => {
  refreshingUserInfo.value = true
  try {
    const userInfo = await fetchCurrentUserInfo()
    preference.value['user-info'] = userInfo
    savePreference()
    mittbus.emit('toast:add', {
      severity: 'success',
      message: '用户数据已刷新'
    })
  } catch (error) {
    logger.error('刷新用户数据失败:', error)
    preference.value['user-info'] = null
    savePreference()
    mittbus.emit('toast:add', {
      severity: 'error',
      message: error instanceof Error ? error.message : String(error)
    })
  } finally {
    refreshingUserInfo.value = false
  }
}

const handleLogout = async (): Promise<void> => {
  showLogoutDialog.value = false
  loggingOut.value = true
  try {
    await authStore.logout()
    authStore.closeProfile()
    mittbus.emit('toast:add', {
      severity: 'success',
      message: '本地登录信息已清空'
    })
  } catch (error) {
    logger.error('退出登录失败:', error)
    mittbus.emit('toast:add', {
      severity: 'error',
      message: error instanceof Error ? error.message : String(error)
    })
  } finally {
    loggingOut.value = false
  }
}
</script>
