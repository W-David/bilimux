<template>
  <div class="h-full w-full flex flex-col overflow-hidden">
    <!-- 顶部 Header -->
    <div class="flex flex-none items-center justify-between border-b border-[#1f1f1f] border-solid p-4 pt-8">
      <div class="min-w-0 flex items-center gap-3">
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
                nicknameStyle
                  ? 'text-[#f6f6f6]'
                  : 'from-pink-400 to-sky-400 bg-linear-to-r bg-clip-text text-transparent'
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
      <div class="flex flex-none items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          @click="showLogoutDialog = true">
          <LogOutIcon data-icon="inline-start" />
          退出登录
        </Button>
      </div>
    </div>

    <!-- 获取收藏夹中：骨架屏 -->
    <div
      v-if="favoritesStore.running"
      class="min-h-0 flex flex-1 overflow-hidden">
      <div class="flex w-72 shrink-0 flex-col gap-3 border-r border-[#1f1f1f] border-solid p-4">
        <Skeleton
          v-for="i in 6"
          :key="`folder-skeleton-${i}`"
          class="h-25 w-full" />
      </div>
      <div class="flex flex-1 flex-col gap-3 p-4">
        <Skeleton
          v-for="i in 6"
          :key="`video-skeleton-${i}`"
          class="h-20 w-full" />
      </div>
    </div>

    <div
      v-else
      class="min-h-0 flex flex-1 overflow-hidden">
      <FolderList
        :folders="folders"
        :error-message="errorMessage"
        :current-folder-id="currentFolder?.id ?? null"
        @select="openFolder"></FolderList>

      <VideoList
        :videos="currentFolder?.videos ?? []"
        :error-message="errorMessage"
        :current-folder="currentFolder"
        :history-map="historyMap"
        @retry="handleRetry"></VideoList>
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
  </div>
</template>

<script setup lang="ts">
import { LogOut as LogOutIcon } from '@lucide/vue'
import { getDownloadHistories, getDownloadHistory, subscribeDownloadItemEndEvent } from '@renderer/api'
import FolderList from '@renderer/components/FolderList.vue'
import VideoList from '@renderer/components/VideoList.vue'
import { mittbus } from '@renderer/ipc'
import { type FavoriteFolderData } from '@renderer/services/favorites'
import { useAuthStore } from '@renderer/store/auth'
import { useFavoritesStore } from '@renderer/store/favorites'
import { usePreferenceStore } from '@renderer/store/preference'
import { safeCover } from '@renderer/utils/media'
import type { DownloadHistoryRecord } from '@shared/types'
import logger from 'electron-log/renderer'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const preferenceStore = usePreferenceStore()
const favoritesStore = useFavoritesStore()
const router = useRouter()

const folders = computed(() => preferenceStore.preference['favorites-data']?.folders ?? [])
const currentFolder = ref<FavoriteFolderData | null>(null)
const userInfo = computed(() => preferenceStore.preference['user-info'] ?? null)
const userName = computed(() => userInfo.value?.uname || '')
const userFace = computed(() => userInfo.value?.face || '')
const userLevel = computed(() => userInfo.value?.level_info?.current_level)
const isVip = computed(() => userInfo.value?.vipStatus === 1)
const vipLabel = computed(() => userInfo.value?.vip_label?.text || '大会员')
const isSeniorMember = computed(() => userInfo.value?.is_senior_member === 1)
const userCoins = computed(() => userInfo.value?.money)
const nicknameStyle = computed(() =>
  userInfo.value?.vip_nickname_color ? { color: userInfo.value.vip_nickname_color } : undefined
)
const errorMessage = ref('')
const refreshing = ref(false)
const showLogoutDialog = ref(false)
const loggingOut = ref(false)
const historyMap = ref<Map<string, DownloadHistoryRecord>>(new Map())

/**
 * 一次性获取当前用户的所有收藏夹及每个收藏夹内的全部视频
 */
const loadData = async (): Promise<void> => {
  if (refreshing.value || favoritesStore.running) return
  refreshing.value = true
  errorMessage.value = ''
  try {
    await favoritesStore.refreshAllFavorites()

    // 刷新后按 id 保留之前选中的收藏夹
    if (currentFolder.value) {
      const selectedId = currentFolder.value.id
      currentFolder.value = folders.value.find(folder => folder.id === selectedId) ?? null
    }
    await loadHistories()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    errorMessage.value = message
    logger.error('获取收藏数据失败:', error)
  } finally {
    refreshing.value = false
  }
}

/**
 * 查询所有视频的下载历史，用于回显下载状态
 */
const loadHistories = async (): Promise<void> => {
  const bvids = folders.value.flatMap(folder => folder.videos.map(video => video.bvid))
  if (bvids.length === 0) return
  try {
    const records = await getDownloadHistories(bvids)
    historyMap.value = new Map(records.map(record => [record.bvid, record]))
  } catch (error) {
    logger.warn('查询下载历史失败:', error)
  }
}

/**
 * 打开收藏夹（数据已一次性获取，直接切换展示）
 */
const openFolder = (folder: FavoriteFolderData): void => {
  currentFolder.value = folder
}

/**
 * 错误状态重试：重新获取全部数据
 */
const handleRetry = (): void => {
  loadData()
}

/**
 * 退出登录：清空主进程、本地持久化以及页面内存中的登录信息，并回到登录页
 */
const handleLogout = async (): Promise<void> => {
  loggingOut.value = true
  try {
    await authStore.logout()
    // 清空页面内存中的选中状态与下载历史映射
    currentFolder.value = null
    errorMessage.value = ''
    historyMap.value = new Map()
    showLogoutDialog.value = false
    mittbus.emit('toast:add', {
      severity: 'success',
      message: '本地登录信息已清空'
    })
    router.push({ name: 'download-auth' })
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

const unsubscribes: (() => void)[] = []

const registerSubscribe = (fn: () => void): void => {
  unsubscribes.push(fn)
}

const unregisterSubscribes = (): void => {
  unsubscribes.forEach(fn => fn && fn())
  unsubscribes.length = 0
}

registerSubscribe(
  subscribeDownloadItemEndEvent(async ({ bvid, success }) => {
    if (success) {
      try {
        const record = await getDownloadHistory(bvid)
        if (record) {
          historyMap.value.set(bvid, record)
        }
      } catch (error) {
        logger.warn('刷新下载历史失败:', error)
      }
    }
  })
)

const onDownloadHistoryCleared = (): void => {
  historyMap.value = new Map()
}
mittbus.on('download:history:cleared', onDownloadHistoryCleared)

onMounted(() => {
  loadData()
})

onUnmounted(() => {
  mittbus.off('download:history:cleared', onDownloadHistoryCleared)
  unregisterSubscribes()
})
</script>

<style scoped></style>
