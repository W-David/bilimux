<template>
  <ConvertTaskList
    :items="convertStore.unconvertedList"
    empty-text="暂无未完成的任务"
    empty-icon="i-mdi-file-remove-outline" />
</template>

<script setup lang="ts">
import ConvertTaskList from '@renderer/components/ConvertTaskList.vue'
import { useConvertStore } from '@renderer/store/convert'

const convertStore = useConvertStore()
</script>

<style scoped></style>
