<template>
  <Dialog
    :open="authStore.loginOpen"
    @update:open="onOpenChange">
    <DialogContent class="w-[22rem] max-w-[22rem] gap-2 p-6 sm:max-w-[22rem]">
      <DialogHeader class="text-center sm:text-center">
        <DialogTitle>扫码登录 B 站</DialogTitle>
        <DialogDescription>登录后可查看收藏、追番和追剧。本机缓存不需要登录。</DialogDescription>
      </DialogHeader>
      <div class="py-2">
        <Qrcode
          v-if="authStore.loginOpen"
          auto-start
          @success="authStore.closeLogin()" />
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import Qrcode from '@renderer/components/Qrcode.vue'
import { useAuthStore } from '@renderer/store/auth'

const authStore = useAuthStore()

const onOpenChange = (open: boolean): void => {
  if (open) authStore.openLogin()
  else authStore.closeLogin()
}
</script>
