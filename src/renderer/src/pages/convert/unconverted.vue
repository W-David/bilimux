<template>
  <ConvertTaskList
    :items="convertStore.unconvertedList"
    empty-text="暂无未完成的任务"
    :empty-icon="FileXIcon" />
</template>

<script setup lang="ts">
import { FileX as FileXIcon } from '@lucide/vue'
import ConvertTaskList from '@renderer/components/ConvertTaskList.vue'
import { useConvertStore } from '@renderer/store/convert'

const convertStore = useConvertStore()
</script>

<style scoped></style>
