<template>
  <RouterView />
  <Toaster
    theme="dark"
    position="top-right"
    rich-colors
    :close-button="false" />
</template>

<script setup lang="ts">
import { Toaster } from '@renderer/components/ui/sonner'
import { onUnmounted } from 'vue'
import { toast } from 'vue-sonner'
import { mittbus } from './ipc'

mittbus.on('toast:add', ({ severity = 'info', message, data }) => {
  if (severity === 'success') toast.success(message, data)
  else if (severity === 'warn') toast.warning(message, data)
  else if (severity === 'error') toast.error(message, data)
  else toast(message, data)
})

onUnmounted(() => {
  toast.dismiss()
  mittbus.all && mittbus.all.clear()
})
</script>

<style scoped></style>
