<template>
  <ConvertTaskList
    :items="convertStore.waitingList"
    empty-text="暂无待转换任务"
    empty-action-text="缓存扫描"
    :empty-icon="HistoryIcon"
    @empty-action="convertStore.prescan()" />
</template>

<script setup lang="ts">
import { History as HistoryIcon } from '@lucide/vue'
import ConvertTaskList from '@renderer/components/ConvertTaskList.vue'
import { useConvertStore } from '@renderer/store/convert'

const convertStore = useConvertStore()
</script>

<style scoped></style>
