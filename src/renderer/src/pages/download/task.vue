<template>
  <div
    class="h-full w-full p-4"
    flex="~ col items-center gap-3">
    <div class="w-full">
      <Search @search="handleSearch"></Search>
    </div>
    <div
      class="h-full w-full flex-1 p-4"
      border="0 rounded-2xl"
      color="light"
      bg="dark-500">
      {{ metaData }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { getVideoMetaData } from '@renderer/api/network'
import Search from '@renderer/components/Search.vue'
import logger from 'electron-log/renderer'
import { ref } from 'vue'

const metaData = ref()

const handleSearch = async (value: string) => {
  logger.debug('Search:', value)
  const [videoMetaData, errMsg] = await getVideoMetaData(value)
  if (errMsg) {
    logger.error(errMsg)
    return
  }
  if (!videoMetaData) {
    logger.error('获取视频元数据失败')
    return
  }
  metaData.value = {
    initialState: JSON.parse(videoMetaData[0]),
    playInfo: JSON.parse(videoMetaData[1])
  }
}
</script>

<style scoped></style>
