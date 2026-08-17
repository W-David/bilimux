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
          <DialogTitle class="text-sm font-semibold text-gray-100">下载详情</DialogTitle>
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
                v-for="item in rows"
                :key="item.label"
                class="border-b border-white/5 last:border-0">
                <td class="w-24 py-2 pr-3 align-top whitespace-nowrap text-gray-500 text-xs">
                  {{ item.label }}
                </td>
                <td class="py-2 text-right break-all text-gray-300 text-[10px]">
                  {{ item.value }}
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
import { useDownloadStore, type DownloadTaskRow } from '@renderer/store/download'
import { formatDuration, formatFileSize } from '@renderer/utils/media'
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { computed } from 'vue'

const props = defineProps<{
  row: DownloadTaskRow | null
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const downloadStore = useDownloadStore()

const onOpenChange = (open: boolean): void => {
  if (!open) emit('close')
}

const LIVE_STATUS_TEXT: Record<string, string> = {
  idle: '未开始',
  waiting: '等待中',
  downloading: '下载中',
  paused: '已暂停',
  preprocess: '合成中',
  importing: '合成中',
  writing: '合成中',
  success: '已完成',
  fail: '失败'
}

const HISTORY_STATUS_TEXT: Record<string, string> = {
  downloading: '下载中',
  completed: '已完成',
  failed: '失败',
  missing: '文件丢失',
  interrupted: '下载中断',
  cancelled: '已取消'
}

const formatDateTime = (timestamp?: number | null): string => {
  if (!timestamp) return '—'
  const date = new Date(timestamp)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const rows = computed(() => {
  const row = props.row
  if (!row) return []

  const live = downloadStore.getItem(row.video.bvid, row.page.cid)
  const history = row.history
  const outputPath = live.outputPath || history?.outputPath || ''
  const fileName = outputPath.split(/[\\/]/).pop() || '—'
  const fileExists = history?.fileExists
  const duration = row.page.duration || row.video.duration
  const partName = row.page.part?.trim()
  const partText = partName ? `P${row.page.page} ${partName}` : `P${row.page.page}`
  const statusText =
    live.status !== 'idle'
      ? LIVE_STATUS_TEXT[live.status] || live.status
      : history
        ? HISTORY_STATUS_TEXT[history.status] || history.status
        : '—'

  const list: { label: string; value: string }[] = [
    { label: '标题', value: row.video.title || '—' },
    { label: 'BVID', value: row.video.bvid || '—' },
    { label: 'CID', value: String(row.page.cid || '—') },
    { label: '分P', value: partText },
    { label: '总集数', value: row.pagesTotal > 0 ? `${row.pagesTotal}P` : '—' },
    { label: '时长', value: duration ? formatDuration(duration) : '—' },
    { label: 'UP 主', value: row.video.upper.name || '—' },
    { label: '收藏夹', value: row.folderName || '—' },
    { label: '状态', value: statusText }
  ]

  if (live.message) {
    list.push({ label: '说明', value: live.message })
  }
  if (live.status !== 'idle' && live.status !== 'success') {
    list.push({ label: '进度', value: `${live.progress}%` })
  }

  list.push(
    { label: '文件名', value: fileName },
    { label: '保存路径', value: outputPath || '—' },
    { label: '文件大小', value: formatFileSize(history?.fileSize ?? null) || '—' },
    { label: '文件存在', value: fileExists == null ? '未知' : fileExists ? '是' : '否' },
    { label: '下载时间', value: formatDateTime(history?.downloadedAt) },
    { label: '更新时间', value: formatDateTime(history?.updatedAt) }
  )

  return list
})
</script>
