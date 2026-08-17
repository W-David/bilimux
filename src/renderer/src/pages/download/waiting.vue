<template>
  <div class="h-full w-full flex flex-col overflow-hidden">
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
        :videos="pendingVideos"
        :error-message="errorMessage"
        :current-folder="currentFolder"
        :history-map="downloadStore.historyMap"
        empty-text="该收藏夹暂无待下载视频"
        @retry="handleRetry"></VideoList>
    </div>
  </div>
</template>

<script setup lang="ts">
import FolderList from '@renderer/components/FolderList.vue'
import VideoList from '@renderer/components/VideoList.vue'
import { type FavoriteFolderData } from '@renderer/services/favorites'
import { useDownloadStore } from '@renderer/store/download'
import { useFavoritesStore } from '@renderer/store/favorites'
import { usePreferenceStore } from '@renderer/store/preference'
import logger from 'electron-log/renderer'
import { computed, onMounted, ref, watch } from 'vue'

const preferenceStore = usePreferenceStore()
const favoritesStore = useFavoritesStore()
const downloadStore = useDownloadStore()

const folders = computed(() => preferenceStore.preference['favorites-data']?.folders ?? [])
const currentFolder = ref<FavoriteFolderData | null>(null)
const userInfo = computed(() => preferenceStore.preference['user-info'] ?? null)
const errorMessage = ref('')
const refreshing = ref(false)

const pendingVideos = computed(() =>
  (currentFolder.value?.videos ?? []).filter(video => downloadStore.hasPendingParts(video))
)

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

const openFolder = (folder: FavoriteFolderData): void => {
  currentFolder.value = folder
}

const handleRetry = (): void => {
  loadData()
}
</script>
