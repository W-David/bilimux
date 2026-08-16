<template>
  <div class="h-full w-full overflow-y-auto">
    <div
      v-if="items.length === 0"
      class="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
      <component
        :is="emptyIcon"
        class="size-10" />
      <span class="text-sm">{{ emptyText }}</span>
      <Button
        v-if="emptyActionText"
        size="sm"
        variant="outline"
        @click="emit('empty-action')">
        {{ emptyActionText }}
      </Button>
    </div>

    <div
      v-else
      class="flex flex-col items-center gap-3 p-4">
      <ConvertTaskItem
        v-for="item in items"
        :key="item.id"
        :task="item"
        :actions="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Inbox as InboxIcon } from '@lucide/vue'
import type { ConvertTask } from '@renderer/types/convert'
import type { Component } from 'vue'
import ConvertTaskItem from './ConvertTaskItem.vue'

withDefaults(
  defineProps<{
    items: ConvertTask[]
    emptyText?: string
    emptyIcon?: Component
    emptyActionText?: string
    actions?: 'status' | 'info' | 'all'
  }>(),
  {
    emptyText: '暂无任务',
    emptyIcon: InboxIcon,
    emptyActionText: '',
    actions: 'all'
  }
)

const emit = defineEmits<{
  (e: 'empty-action'): void
}>()
</script>

<style scoped></style>
