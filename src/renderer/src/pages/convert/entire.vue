<template>
  <ConvertTaskList
    :items="convertStore.entireList"
    empty-text="暂无转换记录"
    :empty-icon="HistoryIcon" />
</template>

<script setup lang="ts">
import { History as HistoryIcon } from '@lucide/vue'
import ConvertTaskList from '@renderer/components/ConvertTaskList.vue'
import { useConvertStore } from '@renderer/store/convert'

const convertStore = useConvertStore()
</script>

<style scoped></style>
