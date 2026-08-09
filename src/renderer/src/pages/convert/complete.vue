<template>
  <ConvertTaskList
    :items="convertStore.completedList"
    empty-text="暂无已完成的任务"
    :empty-icon="CircleCheckIcon" />
</template>

<script setup lang="ts">
import { CircleCheck as CircleCheckIcon } from '@lucide/vue'
import ConvertTaskList from '@renderer/components/ConvertTaskList.vue'
import { useConvertStore } from '@renderer/store/convert'

const convertStore = useConvertStore()
</script>

<style scoped></style>
