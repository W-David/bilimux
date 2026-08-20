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
          <Tooltip>
            <TooltipTrigger>
              <span
                class="ml-1 inline-block cursor-pointer hover:text-pink-400"
                @click="showClearDialog = true">
                <Trash2Icon class="size-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="right">清空日志文件</TooltipContent>
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

    <!-- 清空日志确认弹窗 -->
    <AlertDialog v-model:open="showClearDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>清空日志</AlertDialogTitle>
          <AlertDialogDescription>确定要清空当前日志文件吗？此操作不可恢复。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction @click="handleClearLog">清空日志</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { ExternalLink as ExternalLinkIcon, Trash2 as Trash2Icon } from '@lucide/vue'
import { emitter, mittbus } from '@renderer/ipc'
import { usePreferenceStore } from '@renderer/store/preference'
import logger from 'electron-log/renderer'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'

const store = usePreferenceStore()
const { preference } = storeToRefs(store)

const logLevelOptions = ref(['verbose', 'info', 'warn', 'error'])
const showClearDialog = ref(false)

const openLog = async (): Promise<void> => {
  const err = await emitter.invoke('open-log-file')
  if (err) {
    logger.error(err)
    mittbus.emit('toast:add', {
      severity: 'error',
      message: err
    })
  }
}

const handleClearLog = async (): Promise<void> => {
  showClearDialog.value = false
  try {
    const ok = await emitter.invoke('clear-log-file')
    if (ok) {
      mittbus.emit('toast:add', {
        severity: 'success',
        message: '日志已清空'
      })
    } else {
      mittbus.emit('toast:add', {
        severity: 'error',
        message: '清空日志失败'
      })
    }
  } catch (error) {
    logger.error('清空日志失败:', error)
    mittbus.emit('toast:add', {
      severity: 'error',
      message: error instanceof Error ? error.message : String(error)
    })
  }
}
</script>

<style scoped></style>
