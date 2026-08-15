<template>
  <div class="h-full w-full flex flex-col overflow-hidden">
    <!-- 顶部 Header -->
    <div class="flex flex-none items-center justify-between border-b border-[#1f1f1f] border-solid p-4 pt-8">
      <UserCard :user="userInfo" />
      <div class="flex flex-none items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          @click="openDownloadFolder">
          <FolderOpenIcon data-icon="inline-start" />
          下载目录
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
        @select="openFolder"
        @refresh="handleRetry"></FolderList>

      <VideoList
        :videos="currentFolder?.videos ?? []"
        :error-message="errorMessage"
        :current-folder="currentFolder"
        :history-map="historyMap"
        @retry="handleRetry"></VideoList>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FolderOpen as FolderOpenIcon } from '@lucide/vue'
import { getDownloadHistories, getDownloadHistory, openPath, subscribeDownloadItemEndEvent } from '@renderer/api'
import FolderList from '@renderer/components/FolderList.vue'
import VideoList from '@renderer/components/VideoList.vue'
import { mittbus } from '@renderer/ipc'
import { type FavoriteFolderData } from '@renderer/services/favorites'
import { useFavoritesStore } from '@renderer/store/favorites'
import { usePreferenceStore } from '@renderer/store/preference'
import type { DownloadHistoryRecord } from '@shared/types'
import logger from 'electron-log/renderer'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const preferenceStore = usePreferenceStore()
const favoritesStore = useFavoritesStore()

const folders = computed(() => preferenceStore.preference['favorites-data']?.folders ?? [])
const currentFolder = ref<FavoriteFolderData | null>(null)
const userInfo = computed(() => preferenceStore.preference['user-info'] ?? null)
const errorMessage = ref('')
const refreshing = ref(false)
const historyMap = ref<Map<string, DownloadHistoryRecord>>(new Map())
// 收藏夹数据版本号：丢弃过期的下载历史查询结果，避免旧数据覆盖新数据
let historyLoadVersion = 0

/**
 * 一次性获取当前用户的所有收藏夹及每个收藏夹内的全部视频
 */
const loadData = async (): Promise<void> => {
  if (refreshing.value || favoritesStore.running) return
  refreshing.value = true
  errorMessage.value = ''
  try {
    await favoritesStore.refreshAllFavorites()
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
  const version = ++historyLoadVersion
  const bvids = folders.value.flatMap(folder => folder.videos.map(video => video.bvid))
  if (bvids.length === 0) {
    historyMap.value = new Map()
    return
  }
  try {
    const records = await getDownloadHistories(bvids)
    if (version !== historyLoadVersion) return
    historyMap.value = new Map(records.map(record => [record.bvid, record]))
  } catch (error) {
    logger.warn('查询下载历史失败:', error)
  }
}

// 收藏夹数据变化（登录获取完成、手动刷新、清空缓存）时重新加载下载历史，
// 避免挂载时只加载一次导致 historyMap 与新数据不匹配
watch(
  () => preferenceStore.preference['favorites-data'],
  () => {
    void loadHistories()
  },
  { immediate: true }
)

watch(
  folders,
  list => {
    if (list.length === 0) {
      currentFolder.value = null
      return
    }
    const currentId = currentFolder.value?.id
    const matched = currentId != null ? list.find(folder => folder.id === currentId) : undefined
    currentFolder.value = matched ?? list[0]
  },
  { immediate: true }
)

onMounted(() => {
  if (folders.value.length === 0 && userInfo.value?.mid && !favoritesStore.running) {
    void loadData()
  }
})

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

const openDownloadFolder = async (): Promise<void> => {
  const outputDir = preferenceStore.preference['download-config'].outputDir
  const errMessage = await openPath(outputDir)
  if (errMessage) {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: errMessage
    })
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

onUnmounted(() => {
  mittbus.off('download:history:cleared', onDownloadHistoryCleared)
  unregisterSubscribes()
})
</script>

<style scoped></style>
