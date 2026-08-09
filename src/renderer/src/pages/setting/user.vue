<template>
  <div class="flex flex-col gap-4 py-4">
    <!-- 当前登录用户信息展示 -->
    <div
      v-if="currentUserInfo"
      class="flex items-center gap-3 rounded-xl bg-gray-800/40 p-3 ring-1 ring-white/5">
      <Avatar
        v-if="userFace"
        size="lg">
        <AvatarImage
          :src="safeCover(userFace)"
          alt="" />
        <AvatarFallback>{{ (userName || 'Bili').slice(0, 1) }}</AvatarFallback>
      </Avatar>
      <Avatar
        v-else
        size="lg">
        <AvatarFallback>{{ (userName || 'Bili').slice(0, 1) }}</AvatarFallback>
      </Avatar>
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <span
            class="truncate text-base font-black"
            :class="
              nicknameStyle ? 'text-[#f6f6f6]' : 'from-pink-400 to-sky-400 bg-linear-to-r bg-clip-text text-transparent'
            "
            :style="nicknameStyle">
            {{ userName || 'Bili' }}
          </span>
          <span
            v-if="userLevel !== undefined"
            class="shrink-0 rounded-sm bg-pink-400/15 px-1.5 py-0.5 text-[10px] text-pink-400 font-bold">
            LV{{ userLevel }}
          </span>
          <span
            v-if="isVip"
            class="shrink-0 rounded-sm bg-violet-400/15 px-1.5 py-0.5 text-[10px] text-violet-300 font-bold">
            {{ vipLabel }}
          </span>
          <span
            v-if="isSeniorMember"
            class="shrink-0 rounded-sm bg-sky-400/15 px-1.5 py-0.5 text-[10px] text-sky-300 font-bold">
            硬核会员
          </span>
        </div>
        <div
          v-if="userCoins !== undefined"
          class="mt-1 text-xs text-gray-400">
          {{ userCoins }} 硬币
        </div>
      </div>
    </div>
    <div
      v-else
      class="rounded-xl bg-gray-800/40 p-4 text-center text-sm text-gray-400 ring-1 ring-white/5">
      尚未登录，请
      <span
        class="cursor-pointer text-pink-400 font-medium hover:underline"
        @click="goToLogin">
        扫码登录
      </span>
    </div>

    <div class="flex items-center justify-between">
      <label class="font-normal">重新获取用户数据</label>
      <Button
        size="sm"
        variant="outline"
        :disabled="refreshingUserInfo || favoritesStore.running"
        @click="refreshUserInfo">
        <Spinner
          v-if="refreshingUserInfo"
          data-icon="inline-start" />
        <RefreshCwIcon
          v-else
          data-icon="inline-start" />
        刷新
      </Button>
    </div>

    <div class="flex items-center justify-between">
      <label class="font-normal">退出登录</label>
      <Button
        size="sm"
        variant="destructive"
        :disabled="!currentUserInfo || loggingOut || favoritesStore.running"
        @click="showLogoutDialog = true">
        <Spinner
          v-if="loggingOut"
          data-icon="inline-start" />
        <LogOutIcon
          v-else
          data-icon="inline-start" />
        退出登录
      </Button>
    </div>

    <!-- 退出登录确认弹窗 -->
    <AlertDialog v-model:open="showLogoutDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>退出登录</AlertDialogTitle>
          <AlertDialogDescription>确定要退出当前账号吗？退出后将清除本地保存的登录信息。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="loggingOut">取消</AlertDialogCancel>
          <AlertDialogAction
            :disabled="loggingOut || favoritesStore.running"
            @click="handleLogout">
            <Spinner
              v-if="loggingOut"
              data-icon="inline-start" />
            退出登录
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { LogOut as LogOutIcon, RefreshCw as RefreshCwIcon } from '@lucide/vue'
import { mittbus } from '@renderer/ipc'
import { fetchCurrentUserInfo } from '@renderer/services/user'
import { useAuthStore } from '@renderer/store/auth'
import { useFavoritesStore } from '@renderer/store/favorites'
import { usePreferenceStore } from '@renderer/store/preference'
import { safeCover } from '@renderer/utils/media'
import logger from 'electron-log/renderer'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

const store = usePreferenceStore()
const { preference } = storeToRefs(store)
const { savePreference } = store
const authStore = useAuthStore()
const favoritesStore = useFavoritesStore()
const router = useRouter()

const refreshingUserInfo = ref(false)
const loggingOut = ref(false)
const showLogoutDialog = ref(false)

const currentUserInfo = computed(() => preference.value['user-info'] ?? null)
const userName = computed(() => currentUserInfo.value?.uname || '')
const userFace = computed(() => currentUserInfo.value?.face || '')
const userLevel = computed(() => currentUserInfo.value?.level_info?.current_level)
const isVip = computed(() => currentUserInfo.value?.vipStatus === 1)
const vipLabel = computed(() => currentUserInfo.value?.vip_label?.text || '大会员')
const isSeniorMember = computed(() => currentUserInfo.value?.is_senior_member === 1)
const userCoins = computed(() => currentUserInfo.value?.money)
const nicknameStyle = computed(() =>
  currentUserInfo.value?.vip_nickname_color ? { color: currentUserInfo.value.vip_nickname_color } : undefined
)

const goToLogin = (): void => {
  router.push({ name: 'download-auth' })
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

<style scoped></style>
