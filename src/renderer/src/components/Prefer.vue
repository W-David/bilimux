<template>
  <div class="mx-auto h-full w-full flex flex-col gap-4">
    <div class="flex-1">
      <div class="mt-8 flex flex-col px-8">
        <div class="mb-6 border-l-4 border-l-[#FB7299] border-l-style-solid pl-2 font-size-5 font-bold">常规设置</div>
        <div class="flex flex-col gap-4 pl-4">
          <div class="flex items-center justify-between">
            <label class="font-normal">开机自启</label>
            <ToggleSwitch v-model="preference['open-at-login']" />
          </div>
          <div class="flex items-center justify-between">
            <label class="font-normal">失焦自动隐藏窗口</label>
            <ToggleSwitch v-model="preference['auto-hide-window']" />
          </div>
          <div class="flex items-center justify-between">
            <label class="font-normal">关闭时隐藏到托盘</label>
            <ToggleSwitch v-model="preference['bind-close-to-hide']" />
          </div>
          <div class="flex items-center justify-between">
            <div>
              <label class="font-normal">日志等级</label>
              <div
                title="查看日志"
                class="i-mdi-open-in-new ml-2 cursor-pointer text-[18px] hover:color-[#FB7299]"
                @click="openLog"></div>
            </div>
            <SelectButton
              v-model="preference['log-level']"
              :options="logLevelOptions"
              size="mini" />
          </div>
        </div>
      </div>

      <div class="mt-4 flex flex-col px-8">
        <div class="mb-6 border-l-4 border-l-[#FB7299] border-l-style-solid pl-2 font-size-5 font-bold">转换配置</div>
        <div class="flex flex-col gap-4 pl-4">
          <div class="flex flex-col gap-2">
            <label class="font-normal">缓存目录 (B站下载目录)</label>
            <InputGroup>
              <InputText
                v-model="preference['convert-config'].cachePath"
                placeholder="选择缓存目录" />
              <Button
                icon="i-mdi-folder-open text-lg"
                @click="selectCachePath" />
            </InputGroup>
          </div>

          <div class="flex flex-col gap-2">
            <label class="font-normal">输出目录</label>
            <InputGroup>
              <InputText
                v-model="preference['convert-config'].outputDir"
                placeholder="选择输出目录" />
              <Button
                icon="i-mdi-folder-open text-lg"
                @click="selectOutputDir" />
            </InputGroup>
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-start gap-4">
              <label class="font-normal">内置 GPAC(MP4Box) 路径</label>
              <div
                class="i-mdi-lightning-bolt-circle cursor-pointer hover:shadow"
                :class="[isValidEngine ? 'color-green' : 'color-red']"
                @click="checkMp4Box(true)"></div>
            </div>
            <InputGroup>
              <InputText
                :model-value="preference['convert-config'].gpacBinPath"
                disabled
                placeholder="系统默认路径" />
              <Button
                icon="i-mdi-folder-open text-lg"
                @click="openGpacPath" />
            </InputGroup>
          </div>

          <div class="flex items-center justify-between">
            <label class="font-normal">覆盖生成M4S文件</label>
            <ToggleSwitch v-model="preference['convert-config'].forceTransform" />
          </div>

          <div class="flex items-center justify-between">
            <label class="font-normal">覆盖生成视频文件</label>
            <ToggleSwitch v-model="preference['convert-config'].forceComposition" />
          </div>
        </div>
      </div>
    </div>

    <div class="h-15 w-full bg-transparent pl-4 shadow backdrop-blur">
      <div class="h-full w-full flex justify-end gap-4 p-3">
        <Button
          label="重置"
          severity="secondary"
          text
          @click="clear" />
        <Button
          label="保存"
          icon="i-mdi-content-save"
          @click="save" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  checkEngine,
  clearNativeStore,
  openFileDialog,
  openFolder,
  openLogFile,
  subscribeFetchPreferenceEvent
} from '@renderer/api'
import { mittbus } from '@renderer/ipc'
import { usePreferenceStore } from '@renderer/store/preference'
import logger from 'electron-log/renderer'
import { storeToRefs } from 'pinia'
import { onUnmounted, ref } from 'vue'

const store = usePreferenceStore()
const { preference } = storeToRefs(store)
const { fetchPreference, savePreference } = store

const logLevelOptions = ref(['verbose', 'info', 'warn', 'error'])
const isValidEngine = ref(true)

const subscribe = subscribeFetchPreferenceEvent(async () => {
  try {
    await fetchPreference()
    mittbus.emit('toast:add', {
      severity: 'success',
      summary: '成功',
      detail: '已更新配置',
      life: 1000,
      closable: false
    })
  } catch (error) {
    logger.error(error)
    mittbus.emit('toast:add', {
      severity: 'error',
      summary: '错误',
      detail: error,
      life: 5000
    })
  }
})

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
      summary: '错误',
      detail: err
    })
  })
}

const checkMp4Box = async (toastShow?: boolean): Promise<void> => {
  const isValid = await checkEngine()
  isValidEngine.value = isValid
  if (toastShow) {
    mittbus.emit('toast:add', {
      severity: isValid ? 'success' : 'error',
      summary: isValid ? '成功' : '出错了',
      detail: isValid ? '已成功安装Mp4box' : '请确认您已安装Mp4Box',
      closable: false,
      life: 2000
    })
  }
}

const openLog = async (): Promise<void> => {
  const err = await openLogFile()
  if (err) {
    logger.error(err)
    mittbus.emit('toast:add', {
      severity: 'error',
      summary: '错误',
      detail: err,
      closable: false,
      life: 2000
    })
  }
}

const save = async (): Promise<void> => {
  savePreference()
}

const clear = (): void => {
  clearNativeStore()
}

logger.debug('Prefer created')
onUnmounted(() => {
  subscribe()
  checkMp4Box()
  logger.debug('Prefer unmounted')
})
</script>

<style scoped></style>
