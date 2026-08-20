<template>
  <div class="flex flex-col gap-4 py-4">
    <PathField
      v-model="preference['convert-config'].cachePath"
      label="缓存目录 (B站下载目录)"
      placeholder="选择缓存目录" />
    <PathField
      v-model="preference['convert-config'].outputDir"
      label="输出目录"
      placeholder="选择输出目录" />
    <PathField
      :model-value="preference['convert-config'].gpacBinPath"
      label="内置 GPAC(Mp4box) 路径"
      placeholder="系统默认路径"
      disabled
      action="reveal">
      <template #label-extra>
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
      </template>
    </PathField>

    <ConcurrentSelect
      v-model="preference['convert-config'].concurrent"
      label="并行转换数"
      placeholder="选择并行转换数" />

    <div class="flex items-center justify-between">
      <label class="font-normal">替换重名文件</label>
      <Switch v-model="preference['convert-config'].replaceExisting" />
    </div>

    <ClearHistoryRow
      label="清空转换历史"
      dialog-title="清空转换历史"
      dialog-description="确定要清空全部转换历史吗？此操作不可恢复。"
      success-message="转换历史已清空"
      :clear="convertStore.clearHistory" />
  </div>
</template>

<script setup lang="ts">
import { Zap as ZapIcon } from '@lucide/vue'
import { emitter, mittbus } from '@renderer/ipc'
import { useConvertStore } from '@renderer/store/convert'
import { usePreferenceStore } from '@renderer/store/preference'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import ClearHistoryRow from './ClearHistoryRow.vue'
import ConcurrentSelect from './ConcurrentSelect.vue'
import PathField from './PathField.vue'

const convertStore = useConvertStore()
const store = usePreferenceStore()
const { preference } = storeToRefs(store)

const isValidEngine = ref(true)

const checkMp4Box = async (toastShow?: boolean): Promise<void> => {
  const isValid = await emitter.invoke('check-engine')
  isValidEngine.value = isValid
  if (toastShow) {
    mittbus.emit('toast:add', {
      severity: isValid ? 'success' : 'error',
      message: isValid ? '已成功安装Mp4box' : '请确认您已安装Mp4Box'
    })
  }
}
</script>
