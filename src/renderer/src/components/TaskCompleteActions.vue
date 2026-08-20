<template>
  <div class="flex items-center gap-2">
    <DeleteTaskDialog
      :title="deleteTitle"
      :description="deleteDescription"
      :file-option-label="fileOptionLabel"
      @confirm="emit('delete', $event)">
      <button
        type="button"
        aria-label="删除任务"
        :disabled="!canDelete"
        class="group flex size-6 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent">
        <Trash2Icon
          class="size-4 text-red-400 transition-all duration-200 group-hover:scale-125 group-hover:text-red-300 group-disabled:scale-100" />
      </button>
    </DeleteTaskDialog>
    <button
      type="button"
      aria-label="打开文件所在位置"
      :disabled="!canReveal"
      class="group flex size-6 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      @click="emit('reveal')">
      <FolderOpenIcon
        class="size-4 text-gray-300 transition-all duration-200 group-hover:scale-125 group-hover:text-white group-disabled:scale-100" />
    </button>
    <button
      type="button"
      aria-label="文件详情"
      class="group flex size-6 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/10"
      @click="emit('details')">
      <InfoIcon class="size-4 text-gray-300 transition-all duration-200 group-hover:scale-125 group-hover:text-white" />
    </button>
    <button
      v-if="canPlay"
      type="button"
      aria-label="打开文件"
      class="group flex size-6 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/10"
      @click="emit('play')">
      <CirclePlayIcon
        class="size-4 text-gray-400 transition-all duration-200 group-hover:scale-125 group-hover:text-green-400" />
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
