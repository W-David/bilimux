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
          <DialogTitle class="text-sm font-semibold text-gray-100">{{ title }}</DialogTitle>
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
import type { TaskDetailRow } from '@renderer/components/taskDetails'
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'

defineProps<{
  title: string
  rows: TaskDetailRow[]
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const onOpenChange = (open: boolean): void => {
  if (!open) emit('close')
}
</script>
