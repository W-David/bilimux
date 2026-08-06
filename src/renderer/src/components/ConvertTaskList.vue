<template>
  <div class="h-full w-full overflow-y-auto">
    <div
      v-if="items.length === 0"
      class="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
      <i
        :class="emptyIcon"
        class="text-4xl"></i>
      <span class="text-sm">{{ emptyText }}</span>
    </div>

    <div
      v-else
      class="flex flex-col items-center gap-2 py-4">
      <ConvertTaskItem
        v-for="item in items"
        :key="item.id"
        :task="item" />
    </div>
  </div>
</template>

<script setup lang="ts">
import ConvertTaskItem, { type ConvertTask } from './ConvertTaskItem.vue'

withDefaults(
  defineProps<{
    items: ConvertTask[]
    emptyText?: string
    emptyIcon?: string
  }>(),
  {
    emptyText: '暂无任务',
    emptyIcon: 'i-mdi-inbox-outline'
  }
)
</script>

<style scoped></style>
