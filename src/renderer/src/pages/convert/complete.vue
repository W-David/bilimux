<template>
  <ConvertTaskList
    :items="items"
    empty-text="暂无已完成的任务"
    :empty-icon="CircleCheckIcon"
    actions="all" />
</template>

<script setup lang="ts">
import { CircleCheck as CircleCheckIcon } from '@lucide/vue'
import ConvertTaskList from '@renderer/components/ConvertTaskList.vue'
import { useConvertStore } from '@renderer/store/convert'
import { computed } from 'vue'

const convertStore = useConvertStore()
const items = computed(() => [...convertStore.completedList, ...convertStore.unconvertedList])
</script>

<style scoped></style>
