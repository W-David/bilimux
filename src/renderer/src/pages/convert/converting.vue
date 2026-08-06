<template>
  <ConvertTaskList
    :items="convertStore.convertingList"
    empty-text="暂无进行中的任务"
    empty-icon="i-mdi-progress-clock" />
</template>

<script setup lang="ts">
import ConvertTaskList from '@renderer/components/ConvertTaskList.vue'
import { useConvertStore } from '@renderer/store/convert'

const convertStore = useConvertStore()
</script>

<style scoped></style>
