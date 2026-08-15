<template>
  <ConvertTaskList
    :items="convertStore.entireList"
    empty-text="暂无转换记录"
    empty-action-text="去配置缓存目录"
    :empty-icon="HistoryIcon"
    @empty-action="goToConvertSettings" />
</template>

<script setup lang="ts">
import { History as HistoryIcon } from '@lucide/vue'
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
