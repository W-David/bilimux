<template>
  <RouterView />
  <Toaster
    theme="dark"
    rich-colors
    :close-button="false" />
</template>

<script setup lang="ts">
import { Toaster } from '@renderer/components/ui/sonner'
import { onUnmounted } from 'vue'
import { ExternalToast, toast } from 'vue-sonner'
import { mittbus } from './ipc'

mittbus.on('toast:add', ({ severity = 'info', message, data }) => {
  const _data = data ? data : ({ position: 'top-right' } as ExternalToast)
  if (severity === 'success') toast.success(message, _data)
  else if (severity === 'warn') toast.warning(message, _data)
  else if (severity === 'error') toast.error(message, _data)
  else toast(message, _data)
})

onUnmounted(() => {
  toast.dismiss()
  mittbus.all && mittbus.all.clear()
})
</script>

<style scoped></style>
