<template>
  <Toaster
    position="top-right"
    rich-colors
    close-button />
  <RouterView />
</template>

<script setup lang="ts">
import { onUnmounted } from 'vue'
import { toast } from 'vue-sonner'
import { Toaster } from '@renderer/components/ui/sonner'
import { mittbus } from './ipc'

mittbus.on('toast:add', payload => {
  const { severity = 'info', summary = '', detail = '', life = 3000 } = payload
  const message = detail ? (summary ? `${summary}：${detail}` : detail) : summary
  const options = { duration: life }
  if (severity === 'success') toast.success(message, options)
  else if (severity === 'warn') toast.warning(message, options)
  else if (severity === 'error') toast.error(message, options)
  else toast(message, options)
})

onUnmounted(() => {
  toast.dismiss()
  mittbus.all && mittbus.all.clear()
})
</script>

<style scoped></style>
