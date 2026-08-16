<template>
  <ConvertTaskList
    :items="convertStore.unconvertedList"
    empty-text="暂无未完成的任务"
    :empty-action-text="convertStore.counts.entire === 0 ? '去配置缓存目录' : ''"
    :empty-icon="FileXIcon"
    actions="info"
    @empty-action="goToConvertSettings" />
</template>

<script setup lang="ts">
import { FileX as FileXIcon } from '@lucide/vue'
import ConvertTaskList from '@renderer/components/ConvertTaskList.vue'
import { useConvertStore } from '@renderer/store/convert'
import { useRouter } from 'vue-router'

const convertStore = useConvertStore()
const router = useRouter()

const goToConvertSettings = (): void => {
  router.push({ name: 'prefer-convert' })
}
</script>

<style scoped></style>
