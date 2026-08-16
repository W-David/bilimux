<template>
  <DialogRoot
    :open="open"
    @update:open="onOpenChange">
    <DialogPortal>
      <DialogOverlay
        class="data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
      <DialogContent
        class="data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right border-white/10 bg-[#0d0d0d]/95 shadow-black/40 fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-105 flex-col border-l p-0 shadow-2xl outline-none duration-300 backdrop-blur-2xl">
        <header class="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <DialogTitle class="text-sm font-semibold text-gray-100">文件详情</DialogTitle>
          <DialogClose as-child>
            <button
              type="button"
              aria-label="关闭详情"
              class="flex size-6 cursor-pointer items-center justify-center rounded-full text-gray-400 transition-colors duration-200 hover:bg-white/10 hover:text-white">
              <XIcon class="size-4" />
            </button>
          </DialogClose>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <table class="w-full">
            <tbody>
              <tr
                v-for="row in rows"
                :key="row.label"
                class="border-b border-white/5 last:border-0">
                <td class="w-24 py-2 pr-3 align-top whitespace-nowrap text-gray-500 text-xs">
                  {{ row.label }}
                </td>
                <td class="py-2 text-right break-all text-gray-300 text-[10px]">
                  {{ row.value }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
import { XIcon } from '@lucide/vue'
import type { ConvertTask } from '@renderer/types/convert'
import { formatDurationMs, formatFileSize } from '@renderer/utils/media'
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { computed } from 'vue'

const props = defineProps<{
  task: ConvertTask | null
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const onOpenChange = (open: boolean): void => {
  if (!open) {
    emit('close')
  }
}

const STATUS_TEXT: Record<string, string> = {
  importing: '导入中',
  writing: '写入中',
  preprocess: '预处理',
  success: '已完成',
  fail: '出错了',
  skipped: '已跳过',
  interrupted: '转换中断',
  missing: '文件丢失',
  waiting: '等待中',
  scanned: '缓存扫描'
}

const typeText = (type?: string): string => {
  if (type === 'ugc') return 'UGC 视频'
  if (type === 'ogv') return 'OGV 剧集'
  return type || '—'
}

const formatDateTime = (timestamp?: number | null): string => {
  if (!timestamp) return '—'
  const date = new Date(timestamp)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const rows = computed(() => {
  const task = props.task
  if (!task) return []
  return [
    { label: '标题', value: task.title || '—' },
    { label: 'BVID', value: task.bvid || '—' },
    { label: '视频类型', value: typeText(task.type) },
    { label: '文件名', value: task.fileName || '—' },
    { label: '状态', value: STATUS_TEXT[task.status] || task.status },
    { label: 'UP 主', value: task.uname || '—' },
    { label: '收藏夹', value: task.groupTitle || '—' },
    { label: '源目录', value: task.sourceDir || '—' },
    { label: '源文件', value: task.filePath || '—' },
    { label: '输出文件', value: task.outputPath || '—' },
    { label: '文件大小', value: formatFileSize(task.fileSize) || '—' },
    { label: '转换耗时', value: formatDurationMs(task.durationMs) || '—' },
    { label: '文件存在', value: task.fileExists == null ? '未知' : task.fileExists ? '是' : '否' },
    { label: '开始时间', value: formatDateTime(task.startedAt) },
    { label: '完成时间', value: formatDateTime(task.completedAt) },
    { label: '更新时间', value: formatDateTime(task.updatedAt) }
  ].filter(i => !!i)
})
</script>

<style scoped></style>
