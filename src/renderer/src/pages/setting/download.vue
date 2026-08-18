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
      <label class="font-normal">下载清晰度</label>
      <Select
        :model-value="qnValue"
        @update:model-value="onQnChange">
        <SelectTrigger class="w-36">
          <SelectValue placeholder="选择清晰度" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem
              v-for="option in DOWNLOAD_QN_OPTIONS"
              :key="option.qn"
              :value="String(option.qn)">
              {{ option.label }}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>

    <div class="flex items-center justify-between">
      <label class="font-normal">编码偏好</label>
      <Select
        :model-value="codecValue"
        @update:model-value="onCodecChange">
        <SelectTrigger class="w-36">
          <SelectValue placeholder="选择编码" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem
              v-for="option in DOWNLOAD_CODEC_OPTIONS"
              :key="option.value"
              :value="option.value">
              {{ option.label }}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>

    <div class="flex items-center justify-between">
      <label class="font-normal">并行下载任务数</label>
      <Select
        :model-value="concurrentValue"
        @update:model-value="onConcurrentChange">
        <SelectTrigger class="w-15">
          <SelectValue placeholder="选择并行任务数" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem
              v-for="option in CONCURRENT_OPTIONS"
              :key="option"
              :value="String(option)">
              {{ option }}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
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
import { FolderOpen as FolderOpenIcon, Trash2 as Trash2Icon } from '@lucide/vue'
import { openFileDialog } from '@renderer/api'
import { mittbus } from '@renderer/ipc'
import { useDownloadStore } from '@renderer/store/download'
import { usePreferenceStore } from '@renderer/store/preference'
import { clampConcurrent, CONCURRENT_OPTIONS } from '@shared/concurrent'
import { clampDownloadCodec, clampDownloadQn, DOWNLOAD_CODEC_OPTIONS, DOWNLOAD_QN_OPTIONS } from '@shared/download'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'

const downloadStore = useDownloadStore()
const store = usePreferenceStore()
const { preference } = storeToRefs(store)

const clearingDownloadHistory = ref(false)
const showClearDialog = ref(false)

const concurrentValue = computed(() => String(clampConcurrent(preference.value['download-config'].concurrent)))

const qnValue = computed(() => String(clampDownloadQn(preference.value['download-config'].qn)))

const codecValue = computed(() => clampDownloadCodec(preference.value['download-config'].codec))

const onConcurrentChange = (value: string | number): void => {
  preference.value['download-config'].concurrent = clampConcurrent(value)
}

const onQnChange = (value: string | number): void => {
  preference.value['download-config'].qn = clampDownloadQn(value)
}

const onCodecChange = (value: string | number): void => {
  preference.value['download-config'].codec = clampDownloadCodec(value)
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
    title: '选择目录',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: preference.value['download-config'].outputDir,
    buttonLabel: '选择'
  })
  if (newPath) {
    preference.value['download-config'].outputDir = newPath
  }
}
</script>

<style scoped></style>
