<template>
  <ConvertTaskList
    :items="convertStore.entireList"
    empty-text="暂无转换记录"
    empty-icon="i-mdi-history" />
</template>

<script setup lang="ts">
import ConvertTaskList from '@renderer/components/ConvertTaskList.vue'
import { useConvertStore } from '@renderer/store/convert'

const convertStore = useConvertStore()
</script>

<style scoped></style>
