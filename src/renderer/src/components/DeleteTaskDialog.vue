<template>
  <AlertDialog @update:open="onOpenChange">
    <AlertDialogTrigger as-child>
      <slot />
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ title }}</AlertDialogTitle>
        <AlertDialogDescription>{{ description }}</AlertDialogDescription>
      </AlertDialogHeader>
      <Field
        v-if="fileOptionLabel"
        orientation="horizontal">
        <Checkbox
          :id="checkboxId"
          v-model="deleteFile" />
        <FieldLabel
          :for="checkboxId"
          class="font-normal">
          {{ fileOptionLabel }}
        </FieldLabel>
      </Field>
      <AlertDialogFooter>
        <AlertDialogCancel>取消</AlertDialogCancel>
        <AlertDialogAction @click="emit('confirm', deleteFile)">删除</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<script setup lang="ts">
import { ref, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    description: string
    fileOptionLabel?: string
    defaultDeleteFile?: boolean
  }>(),
  {
    fileOptionLabel: '',
    defaultDeleteFile: false
  }
)

const emit = defineEmits<{
  (e: 'confirm', deleteFile: boolean): void
}>()

const checkboxId = useId()
const deleteFile = ref(props.defaultDeleteFile)

const onOpenChange = (open: boolean): void => {
  if (open) deleteFile.value = props.defaultDeleteFile
}
</script>
