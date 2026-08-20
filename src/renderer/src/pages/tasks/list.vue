<template>
  <div class="h-full w-full overflow-y-auto">
    <div
      v-if="items.length === 0"
      class="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
      <component
        :is="emptyIcon"
        class="size-10" />
      <span class="text-sm">{{ emptyText }}</span>
    </div>
    <div
      v-else
      class="flex flex-col gap-3 p-4">
      <TaskItem
        v-for="item in items"
        :key="item.id"
        :item="item"
        :lane="laneOf(item)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CircleCheck as CircleCheckIcon, Inbox as InboxIcon, Loader as LoaderIcon } from '@lucide/vue'
import TaskItem from '@renderer/components/TaskItem.vue'
import { useDownloadStore } from '@renderer/store/download'
import { computed, type Component } from 'vue'
import { useRoute } from 'vue-router'
import { isConvertActive, useUnifiedTasks, type UnifiedTask } from './unified'

const route = useRoute()
const { all, active, complete } = useUnifiedTasks()
const downloadStore = useDownloadStore()

const lane = computed<'all' | 'active' | 'complete'>(() => {
  if (route.name === 'tasks-active') return 'active'
  if (route.name === 'tasks-complete') return 'complete'
  return 'all'
})

const items = computed(() => {
  if (lane.value === 'active') return active.value
  if (lane.value === 'complete') return complete.value
  return all.value
})

const emptyText = computed(() => {
  if (lane.value === 'active') return '暂无进行中的任务'
  if (lane.value === 'complete') return '暂无已完成的任务'
  return '暂无任务'
})

const emptyIcon = computed<Component>(() => {
  if (lane.value === 'active') return LoaderIcon
  if (lane.value === 'complete') return CircleCheckIcon
  return InboxIcon
})

const laneOf = (item: UnifiedTask): 'active' | 'complete' => {
  if (item.kind === 'download') {
    return downloadStore.partLane(item.row.video.bvid, item.row.page.cid) === 'active' ? 'active' : 'complete'
  }
  return isConvertActive(item.task) ? 'active' : 'complete'
}
</script>
