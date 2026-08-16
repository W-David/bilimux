<template>
  <div class="h-full w-full flex flex-col overflow-hidden">
    <Header>
      <Button
        size="sm"
        variant="outline"
        @click="openDownloadFolder">
        <FolderOpenIcon data-icon="inline-start" />
        下载目录
      </Button>
    </Header>
    <div class="flex flex-none items-center justify-start gap-2 border-b border-[#1f1f1f] border-solid p-4 pt-8">
      <div class="flex min-w-0 items-center gap-2">
        <SelectModeSwitch
          :model-value="downloadStore.multiSelectMode"
          @update:model-value="downloadStore.setMultiSelectMode" />
        <button
          v-if="showReviewAction"
          type="button"
          class="relative h-8 min-w-24 flex cursor-pointer select-none items-center justify-center overflow-hidden rounded-full px-3 text-xs text-pink-400 card-glassy hover:ring-1 hover:ring-pink-400/20"
          @click="openReview">
          查看所选项
        </button>
      </div>
    </div>

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

    <Dialog v-model:open="confirmOpen">
      <DialogContent
        class="flex w-full min-w-0 max-w-[min(36rem,calc(100vw-2rem))] flex-col overflow-hidden bg-[#121212] p-4 sm:max-w-[min(36rem,calc(100vw-2rem))]"
        @open-auto-focus.prevent>
        <DialogHeader>
          <DialogTitle>查看所选项</DialogTitle>
          <DialogDescription>
            已选择 {{ downloadStore.selectedCount }} 个视频，可查看下载进度或确认下载
          </DialogDescription>
        </DialogHeader>

        <div class="flex max-h-[min(50vh,28rem)] min-h-0 flex-col gap-3 overflow-y-auto">
          <VideoItem
            v-for="entry in downloadStore.selectedList"
            :key="entry.video.bvid"
            :video="entry.video"
            :folder-name="entry.folderName"
            :folder-id="entry.folderId"
            :histories="historyMap.get(entry.video.bvid)"
            review></VideoItem>
        </div>

        <DialogFooter class="bg-transparent">
          <Button
            variant="outline"
            size="sm"
            :disabled="downloading"
            @click="confirmOpen = false">
            取消
          </Button>
          <Button
            size="sm"
            :disabled="downloading || downloadStore.selectedCount === 0"
            @click="confirmDownloadAll">
            <Spinner
              v-if="downloading"
              data-icon="inline-start" />
            确认下载
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { FolderOpen as FolderOpenIcon } from '@lucide/vue'
import {
  getDownloadHistories,
  getDownloadHistory,
  openPath,
  startDownloadVideo,
  subscribeDownloadItemEndEvent
} from '@renderer/api'
import FolderList from '@renderer/components/FolderList.vue'
import Header from '@renderer/components/Header.vue'
import SelectModeSwitch from '@renderer/components/SelectModeSwitch.vue'
import VideoItem from '@renderer/components/VideoItem.vue'
import VideoList from '@renderer/components/VideoList.vue'
import { mittbus } from '@renderer/ipc'
import { type FavoriteFolderData } from '@renderer/services/favorites'
import { useDownloadStore, type DownloadSelectionEntry } from '@renderer/store/download'
import { useFavoritesStore } from '@renderer/store/favorites'
import { usePreferenceStore } from '@renderer/store/preference'
import type { DownloadHistoryRecord } from '@shared/types'
import logger from 'electron-log/renderer'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

function groupHistories(records: DownloadHistoryRecord[]): Map<string, DownloadHistoryRecord[]> {
  const map = new Map<string, DownloadHistoryRecord[]>()
  for (const record of records) {
    const list = map.get(record.bvid) ?? []
    list.push(record)
    map.set(record.bvid, list)
  }
  return map
}

const preferenceStore = usePreferenceStore()
const favoritesStore = useFavoritesStore()
const downloadStore = useDownloadStore()

const folders = computed(() => preferenceStore.preference['favorites-data']?.folders ?? [])
const currentFolder = ref<FavoriteFolderData | null>(null)
const userInfo = computed(() => preferenceStore.preference['user-info'] ?? null)
const errorMessage = ref('')
const refreshing = ref(false)
const historyMap = ref<Map<string, DownloadHistoryRecord[]>>(new Map())
const downloading = ref(false)
const confirmOpen = ref(false)
let historyLoadVersion = 0

const showReviewAction = computed(() => downloadStore.multiSelectMode && downloadStore.selectedCount > 0)

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
    historyMap.value = groupHistories(records)
  } catch (error) {
    logger.warn('查询下载历史失败:', error)
  }
}

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

watch(
  () => downloadStore.multiSelectMode,
  on => {
    if (!on) confirmOpen.value = false
  }
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

const openReview = (): void => {
  confirmOpen.value = true
  for (const entry of downloadStore.selectedList) {
    void downloadStore.loadPages(entry.video.bvid)
  }
}

const enqueueEntry = async (entry: DownloadSelectionEntry): Promise<void> => {
  const pages = await downloadStore.loadPages(entry.video.bvid)
  const targets = entry.cids == null ? pages : pages.filter(page => entry.cids!.includes(page.cid))
  for (const page of targets) {
    const item = downloadStore.getItem(entry.video.bvid, page.cid)
    if (['success', 'downloading', 'waiting', 'preprocess', 'importing', 'writing'].includes(item.status)) {
      continue
    }
    startDownloadVideo({
      bvid: entry.video.bvid,
      cid: page.cid,
      page: page.page,
      pages: pages.length,
      part: page.part,
      title: entry.video.title,
      uname: entry.video.upper.name,
      folderName: entry.folderName,
      coverUrl: entry.video.cover
    })
    item.status = 'waiting'
  }
}

const confirmDownloadAll = async (): Promise<void> => {
  const targets = downloadStore.selectedList.slice()
  if (targets.length === 0) return
  downloading.value = true
  try {
    for (const entry of targets) {
      await enqueueEntry(entry)
    }
    mittbus.emit('toast:add', {
      severity: 'success',
      message: `已加入下载：${targets.length} 个视频`
    })
  } catch (error) {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: error instanceof Error ? error.message : String(error)
    })
  } finally {
    downloading.value = false
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
  subscribeDownloadItemEndEvent(async ({ bvid, cid }) => {
    try {
      const record = await getDownloadHistory({ bvid, cid })
      if (!record) return
      const next = new Map(historyMap.value)
      const list = (next.get(bvid) ?? []).filter(item => item.cid !== cid)
      list.push(record)
      next.set(bvid, list)
      historyMap.value = next
    } catch (error) {
      logger.warn('刷新下载历史失败:', error)
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
