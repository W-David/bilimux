<template>
  <div
    class="flex items-center gap-1 rounded-full border border-white/5 bg-white/6 py-1.5 px-2 shadow-inner shadow-black/20 backdrop-blur-md">
    <DeleteTaskDialog
      :title="deleteTitle"
      :description="deleteDescription"
      :file-option-label="fileOptionLabel"
      @confirm="emit('delete', $event)">
      <button
        type="button"
        aria-label="删除任务"
        :disabled="!canDelete"
        class="flex size-6 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent">
        <Trash2Icon class="size-4 text-red-400 transition-colors hover:text-red-300" />
      </button>
    </DeleteTaskDialog>
    <button
      type="button"
      aria-label="打开文件所在位置"
      :disabled="!canReveal"
      class="flex size-6 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      @click="emit('reveal')">
      <FolderOpenIcon class="size-4 text-gray-300 transition-colors hover:text-white" />
    </button>
    <button
      type="button"
      aria-label="文件详情"
      class="flex size-6 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/10"
      @click="emit('details')">
      <InfoIcon class="size-4 text-gray-300 transition-colors hover:text-white" />
    </button>
    <button
      v-if="canPlay"
      type="button"
      aria-label="打开文件"
      class="flex size-6 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/10"
      @click="emit('play')">
      <CirclePlayIcon class="size-4 text-gray-400 transition-colors hover:text-green-400" />
    </button>
    <slot
      v-else
      name="fail" />
  </div>
</template>

<script setup lang="ts">
import {
  CirclePlay as CirclePlayIcon,
  FolderOpen as FolderOpenIcon,
  Info as InfoIcon,
  Trash2 as Trash2Icon
} from '@lucide/vue'

withDefaults(
  defineProps<{
    deleteTitle: string
    deleteDescription: string
    fileOptionLabel?: string
    canDelete?: boolean
    canReveal?: boolean
    canPlay?: boolean
  }>(),
  {
    fileOptionLabel: '同时删除视频文件',
    canDelete: true,
    canReveal: false,
    canPlay: false
  }
)

const emit = defineEmits<{
  delete: [deleteFile: boolean]
  reveal: []
  details: []
  play: []
}>()
</script>
