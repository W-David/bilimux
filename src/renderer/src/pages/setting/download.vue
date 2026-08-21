<template>
  <div class="flex flex-col gap-4 py-4">
    <PathField
      v-model="preference['download-config'].outputDir"
      label="输出目录"
      placeholder="选择输出目录" />

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

    <ConcurrentSelect
      v-model="preference['download-config'].concurrent"
      label="并行下载任务数" />

    <ClearHistoryRow
      label="清空下载历史"
      dialog-title="清空下载历史"
      dialog-description="确定要清空全部下载历史吗？此操作不可恢复。"
      success-message="下载历史已清空"
      :clear="downloadStore.clearHistory" />
  </div>
</template>

<script setup lang="ts">
import { useDownloadStore } from '@renderer/store/download'
import { usePreferenceStore } from '@renderer/store/preference'
import { clampDownloadCodec, clampDownloadQn, DOWNLOAD_CODEC_OPTIONS, DOWNLOAD_QN_OPTIONS } from '@shared/download'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import ClearHistoryRow from './ClearHistoryRow.vue'
import ConcurrentSelect from './ConcurrentSelect.vue'
import PathField from './PathField.vue'

const downloadStore = useDownloadStore()
const store = usePreferenceStore()
const { preference } = storeToRefs(store)

const qnValue = computed(() => String(clampDownloadQn(preference.value['download-config'].qn)))
const codecValue = computed(() => clampDownloadCodec(preference.value['download-config'].codec))

const onQnChange = (value: string | number): void => {
  preference.value['download-config'].qn = clampDownloadQn(value)
}

const onCodecChange = (value: string | number): void => {
  preference.value['download-config'].codec = clampDownloadCodec(value)
}
</script>
