<template>
  <div class="flex items-center justify-between">
    <label class="font-normal">{{ label }}</label>
    <Button
      size="sm"
      variant="outline"
      :disabled="clearing"
      @click="showDialog = true">
      <Spinner
        v-if="clearing"
        data-icon="inline-start" />
      <Trash2Icon
        v-else
        data-icon="inline-start" />
      清空
    </Button>
  </div>

  <AlertDialog v-model:open="showDialog">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ dialogTitle }}</AlertDialogTitle>
        <AlertDialogDescription>{{ dialogDescription }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>取消</AlertDialogCancel>
        <AlertDialogAction @click="confirm">清空</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<script setup lang="ts">
import { Trash2 as Trash2Icon } from '@lucide/vue'
import { mittbus } from '@renderer/ipc'
import { ref } from 'vue'

const props = defineProps<{
  label: string
  dialogTitle: string
  dialogDescription: string
  successMessage: string
  clear: () => Promise<void>
}>()

const showDialog = ref(false)
const clearing = ref(false)

const confirm = async (): Promise<void> => {
  showDialog.value = false
  clearing.value = true
  try {
    await props.clear()
    mittbus.emit('toast:add', {
      severity: 'success',
      message: props.successMessage
    })
  } catch (error) {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: error instanceof Error ? error.message : String(error)
    })
  } finally {
    clearing.value = false
  }
}
</script>
