<template>
  <Toast />
  <RouterView />
</template>

<script setup lang="ts">
import { useToast } from 'primevue/usetoast'
import { onUnmounted } from 'vue'
import { mittbus } from './ipc'

const toast = useToast()

mittbus.on('toast:add', (payload) => toast.add(payload))

onUnmounted(() => {
  toast.removeAllGroups()
  mittbus.all && mittbus.all.clear()
})
</script>

<style scoped></style>
