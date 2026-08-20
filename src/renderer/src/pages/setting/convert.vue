<template>
  <div class="flex flex-col gap-4 py-4">
    <div class="flex flex-col gap-3">
      <label class="font-normal">缓存目录 (B站下载目录)</label>
      <InputGroup>
        <InputGroupInput
          v-model="preference['convert-config'].cachePath"
          placeholder="选择缓存目录" />
        <InputGroupButton @click="selectCachePath">
          <FolderOpenIcon />
        </InputGroupButton>
      </InputGroup>
    </div>

    <div class="flex flex-col gap-3">
      <label class="font-normal">输出目录</label>
      <InputGroup>
        <InputGroupInput
          v-model="preference['convert-config'].outputDir"
          placeholder="选择输出目录" />
        <InputGroupButton @click="selectOutputDir">
          <FolderOpenIcon />
        </InputGroupButton>
      </InputGroup>
    </div>

    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-start gap-4">
        <label class="font-normal">内置 GPAC(Mp4box) 路径</label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <span
                class="cursor-pointer"
                :class="[isValidEngine ? 'text-green-400' : 'text-red-400']"
                @click="checkMp4Box(true)">
                <ZapIcon class="size-4" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="right">检测Mp4box是否正常</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <InputGroup>
        <InputGroupInput
          :model-value="preference['convert-config'].gpacBinPath"
          disabled
          placeholder="系统默认路径" />
        <InputGroupButton @click="openGpacPath">
          <FolderOpenIcon />
        </InputGroupButton>
      </InputGroup>
    </div>

    <div class="flex items-center justify-between">
      <label class="font-normal">并行转换数</label>
      <Select
        :model-value="concurrentValue"
        @update:model-value="onConcurrentChange">
        <SelectTrigger class="w-15">
          <SelectValue placeholder="选择并行转换数" />
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
      <label class="font-normal">替换重名文件</label>
      <Switch v-model="preference['convert-config'].replaceExisting" />
    </div>

    <div class="flex items-center justify-between">
      <label class="font-normal">清空转换历史</label>
      <Button
        size="sm"
        variant="outline"
        :disabled="clearingHistory"
        @click="showClearDialog = true">
        <Spinner
          v-if="clearingHistory"
          data-icon="inline-start" />
        <Trash2Icon
          v-else
          data-icon="inline-start" />
        清空
      </Button>
    </div>

    <!-- 清空历史确认弹窗 -->
    <AlertDialog v-model:open="showClearDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>清空转换历史</AlertDialogTitle>
          <AlertDialogDescription>确定要清空全部转换历史吗？此操作不可恢复。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction @click="handleClearHistory">清空</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { FolderOpen as FolderOpenIcon, Trash2 as Trash2Icon, Zap as ZapIcon } from '@lucide/vue'
import { checkEngine, openFileDialog, openFolder } from '@renderer/api'
import { mittbus } from '@renderer/ipc'
import { useConvertStore } from '@renderer/store/convert'
import { usePreferenceStore } from '@renderer/store/preference'
import { clampConcurrent, CONCURRENT_OPTIONS } from '@shared/concurrent'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'

const convertStore = useConvertStore()
const store = usePreferenceStore()
const { preference } = storeToRefs(store)

const isValidEngine = ref(true)
const clearingHistory = ref(false)
const showClearDialog = ref(false)

const concurrentValue = computed(() => String(clampConcurrent(preference.value['convert-config'].concurrent)))

const onConcurrentChange = (value: string | number): void => {
  preference.value['convert-config'].concurrent = clampConcurrent(value)
}

const selectCachePath = async (): Promise<void> => {
  const newPath = await openFileDialog({
    title: '选择目录',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: preference.value['convert-config'].cachePath,
    buttonLabel: '选择'
  })
  if (newPath) {
    preference.value['convert-config'].cachePath = newPath
  }
}

const selectOutputDir = async (): Promise<void> => {
  const newPath = await openFileDialog({
    title: '选择目录',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: preference.value['convert-config'].outputDir,
    buttonLabel: '选择'
  })
  if (newPath) {
    preference.value['convert-config'].outputDir = newPath
  }
}

const openGpacPath = async (): Promise<void> => {
  const binPath = preference.value['convert-config'].gpacBinPath
  return openFolder(binPath).catch(err => {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: err
    })
  })
}

const checkMp4Box = async (toastShow?: boolean): Promise<void> => {
  const isValid = await checkEngine()
  isValidEngine.value = isValid
  if (toastShow) {
    mittbus.emit('toast:add', {
      severity: isValid ? 'success' : 'error',
      message: isValid ? '已成功安装Mp4box' : '请确认您已安装Mp4Box'
    })
  }
}

const handleClearHistory = async (): Promise<void> => {
  showClearDialog.value = false
  clearingHistory.value = true
  try {
    await convertStore.clearHistory()
    mittbus.emit('toast:add', {
      severity: 'success',
      message: '转换历史已清空'
    })
  } catch (error) {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: error instanceof Error ? error.message : String(error)
    })
  } finally {
    clearingHistory.value = false
  }
}
</script>

<style scoped></style>
