<template>
  <div class="flex flex-col gap-4 py-4">
    <div class="flex flex-col gap-3">
      <label class="font-normal">输出目录</label>
      <InputGroup>
        <InputGroupInput
          v-model="preference['download-config'].outputDir"
          placeholder="选择输出目录" />
        <InputGroupButton @click="selectDownloadOutputDir">
          <FolderOpenIcon />
        </InputGroupButton>
      </InputGroup>
    </div>

    <div class="flex items-center justify-between">
      <label class="font-normal">并行下载任务数</label>
      <Input
        :model-value="preference['download-config'].concurrent"
        type="number"
        min="1"
        max="16"
        class="w-24 text-right"
        @update:model-value="onConcurrentChange" />
    </div>

    <div class="flex items-center justify-between">
      <label class="font-normal">刷新收藏夹缓存</label>
      <Button
        size="sm"
        variant="outline"
        :disabled="refreshingFavorites"
        @click="refreshFavoritesCache">
        <Spinner
          v-if="refreshingFavorites"
          data-icon="inline-start" />
        <RefreshCwIcon
          v-else
          data-icon="inline-start" />
        刷新
      </Button>
    </div>

    <div class="flex items-center justify-between">
      <label class="font-normal">清空收藏夹缓存</label>
      <Button
        size="sm"
        variant="outline"
        @click="clearFavoritesCache">
        <Trash2Icon data-icon="inline-start" />
        清空
      </Button>
    </div>

    <div class="flex items-center justify-between">
      <label class="font-normal">清空下载历史</label>
      <Button
        size="sm"
        variant="outline"
        :disabled="clearingDownloadHistory"
        @click="showClearDialog = true">
        <Spinner
          v-if="clearingDownloadHistory"
          data-icon="inline-start" />
        <Trash2Icon
          v-else
          data-icon="inline-start" />
        清空
      </Button>
    </div>

    <!-- 清空下载历史确认弹窗 -->
    <AlertDialog v-model:open="showClearDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>清空下载历史</AlertDialogTitle>
          <AlertDialogDescription>确定要清空全部下载历史吗？此操作不可恢复。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction @click="handleClearDownloadHistory">清空</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { FolderOpen as FolderOpenIcon, RefreshCw as RefreshCwIcon, Trash2 as Trash2Icon } from '@lucide/vue'
import { openFileDialog } from '@renderer/api'
import { mittbus } from '@renderer/ipc'
import { useDownloadStore } from '@renderer/store/download'
import { useFavoritesStore } from '@renderer/store/favorites'
import { usePreferenceStore } from '@renderer/store/preference'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'

const downloadStore = useDownloadStore()
const favoritesStore = useFavoritesStore()
const store = usePreferenceStore()
const { preference } = storeToRefs(store)
const { savePreference } = store

const clearingDownloadHistory = ref(false)
const showClearDialog = ref(false)
const refreshingFavorites = ref(false)

const refreshFavoritesCache = async (): Promise<void> => {
  const userInfo = preference.value['user-info']
  if (!userInfo?.mid) {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: '用户信息缺失，请先扫码登录'
    })
    return
  }

  refreshingFavorites.value = true
  try {
    await favoritesStore.refreshAllFavorites()
    mittbus.emit('toast:add', {
      severity: 'success',
      message: '收藏夹缓存已刷新'
    })
  } catch (error) {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: error instanceof Error ? error.message : String(error)
    })
  } finally {
    refreshingFavorites.value = false
  }
}

/**
 * 并行下载任务数变更：限制在 1-16
 */
const onConcurrentChange = (value: string | number): void => {
  const concurrent = Math.min(16, Math.max(1, Math.trunc(Number(value)) || 1))
  preference.value['download-config'].concurrent = concurrent
}

const clearFavoritesCache = (): void => {
  preference.value['favorites-data'] = null
  savePreference()
  mittbus.emit('toast:add', {
    severity: 'success',
    message: '收藏夹缓存已清空'
  })
}

const handleClearDownloadHistory = async (): Promise<void> => {
  showClearDialog.value = false
  clearingDownloadHistory.value = true
  try {
    await downloadStore.clearHistory()
    mittbus.emit('download:history:cleared')
    mittbus.emit('toast:add', {
      severity: 'success',
      message: '下载历史已清空'
    })
  } catch (error) {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: error instanceof Error ? error.message : String(error)
    })
  } finally {
    clearingDownloadHistory.value = false
  }
}

const selectDownloadOutputDir = async (): Promise<void> => {
  const newPath = await openFileDialog({
    title: 'Select Directory',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: preference.value['download-config'].outputDir,
    buttonLabel: 'Select'
  })
  if (newPath) {
    preference.value['download-config'].outputDir = newPath
  }
}
</script>

<style scoped></style>
