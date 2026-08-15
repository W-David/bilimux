<template>
  <ConvertTaskList
    :items="convertStore.entireList"
    empty-text="暂无转换记录"
    empty-action-text="扫描缓存"
    :empty-icon="HistoryIcon"
    :selectable="convertStore.runStatus === 'preview'"
    :selected="convertStore.selectedBvids"
    @empty-action="convertStore.scan()"
    @toggle="convertStore.toggleSelected" />
</template>

<script setup lang="ts">
import { History as HistoryIcon } from '@lucide/vue'
import ConvertTaskList from '@renderer/components/ConvertTaskList.vue'
import { useConvertStore } from '@renderer/store/convert'

const convertStore = useConvertStore()
</script>

<style scoped></style>
