<template>
  <div class="flex flex-col gap-4 py-4">
    <div class="flex items-center justify-between">
      <label class="font-normal">开机自启</label>
      <Switch v-model="preference['open-at-login']" />
    </div>
    <div class="flex items-center justify-between">
      <label class="font-normal">失焦自动隐藏窗口</label>
      <Switch v-model="preference['auto-hide-window']" />
    </div>
    <div class="flex items-center justify-between">
      <label class="font-normal">关闭时隐藏到托盘</label>
      <Switch v-model="preference['bind-close-to-hide']" />
    </div>
    <div class="flex items-center justify-between">
      <div>
        <label class="font-normal">日志等级</label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <span
                class="ml-2 inline-block cursor-pointer hover:text-pink-400"
                @click="openLog">
                <ExternalLinkIcon class="size-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="right">查看日志文件</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <ToggleGroup
        v-model="preference['log-level']"
        type="single"
        size="sm">
        <ToggleGroupItem
          v-for="opt in logLevelOptions"
          :key="opt"
          :value="opt">
          {{ opt }}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ExternalLink as ExternalLinkIcon } from '@lucide/vue'
import { openLogFile } from '@renderer/api'
import { mittbus } from '@renderer/ipc'
import { usePreferenceStore } from '@renderer/store/preference'
import logger from 'electron-log/renderer'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'

const store = usePreferenceStore()
const { preference } = storeToRefs(store)

const logLevelOptions = ref(['verbose', 'info', 'warn', 'error'])

const openLog = async (): Promise<void> => {
  const err = await openLogFile()
  if (err) {
    logger.error(err)
    mittbus.emit('toast:add', {
      severity: 'error',
      message: err
    })
  }
}
</script>

<style scoped></style>
