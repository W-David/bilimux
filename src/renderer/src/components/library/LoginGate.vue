<template>
  <div class="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
    <h2 class="text-base text-[#f6f6f6] font-medium">{{ title }}</h2>
    <p class="text-sm text-gray-500">{{ description }}</p>
    <Button
      size="sm"
      @click="authStore.openLogin()">
      扫码登录
    </Button>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@renderer/store/auth'

withDefaults(
  defineProps<{
    title?: string
    description?: string
  }>(),
  {
    title: '登录后查看',
    description: '追番、追剧同样需要账号。本机缓存和已下载文件不受影响。'
  }
)

const authStore = useAuthStore()
</script>
