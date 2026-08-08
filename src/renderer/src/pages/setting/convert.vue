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
      <label class="font-normal">重名M4S文件覆写</label>
      <Switch v-model="preference['convert-config'].forceTransform" />
    </div>

    <div class="flex items-center justify-between">
      <label class="font-normal">重名视频文件覆写</label>
      <Switch v-model="preference['convert-config'].forceComposition" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { FolderOpen as FolderOpenIcon, Zap as ZapIcon } from '@lucide/vue'
import { checkEngine, openFileDialog, openFolder } from '@renderer/api'
import { mittbus } from '@renderer/ipc'
import { usePreferenceStore } from '@renderer/store/preference'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'

const store = usePreferenceStore()
const { preference } = storeToRefs(store)

const isValidEngine = ref(true)

const selectCachePath = async (): Promise<void> => {
  const newPath = await openFileDialog({
    title: 'Select Directory',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: preference.value['convert-config'].cachePath,
    buttonLabel: 'Select'
  })
  if (newPath) {
    preference.value['convert-config'].cachePath = newPath
  }
}

const selectOutputDir = async (): Promise<void> => {
  const newPath = await openFileDialog({
    title: 'Select Directory',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: preference.value['convert-config'].outputDir,
    buttonLabel: 'Select'
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
</script>

<style scoped></style>
