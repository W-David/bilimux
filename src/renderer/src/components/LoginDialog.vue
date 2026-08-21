<template>
  <Dialog
    :open="authStore.loginOpen"
    @update:open="onOpenChange">
    <DialogContent class="w-80 gap-3 p-6">
      <DialogHeader class="text-center">
        <DialogTitle>扫码登录 B 站</DialogTitle>
        <DialogDescription>查看收藏、追番和追剧</DialogDescription>
      </DialogHeader>
      <div class="py-2">
        <Qrcode auto-start />
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
