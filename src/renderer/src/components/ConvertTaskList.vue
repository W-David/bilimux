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
        :selectable="selectable"
        :selected="selected?.has(item.bvid)"
        @toggle="bvid => emit('toggle', bvid)" />
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
    selectable?: boolean
    selected?: Set<string>
  }>(),
  {
    emptyText: '暂无任务',
    emptyIcon: InboxIcon,
    emptyActionText: '',
    selectable: false,
    selected: undefined
  }
)

const emit = defineEmits<{
  (e: 'empty-action'): void
  (e: 'toggle', bvid: string): void
}>()
</script>

<style scoped></style>
