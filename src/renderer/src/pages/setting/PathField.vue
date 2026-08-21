<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-start gap-4">
      <label class="font-normal">{{ label }}</label>
      <slot name="label-extra" />
    </div>
    <InputGroup>
      <InputGroupInput
        :model-value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        @update:model-value="emit('update:modelValue', String($event ?? ''))" />
      <InputGroupButton @click="onButton">
        <FolderOpenIcon />
      </InputGroupButton>
    </InputGroup>
  </div>
</template>

<script setup lang="ts">
import { FolderOpen as FolderOpenIcon } from '@lucide/vue'
import { emitter } from '@renderer/ipc'
import { revealLocalPath } from '@renderer/utils/open-file'

const props = withDefaults(
  defineProps<{
    label: string
    modelValue: string
    placeholder?: string
    disabled?: boolean
    /** directory：选目录写入 v-model；reveal：打开当前路径所在位置 */
    action?: 'directory' | 'reveal'
  }>(),
  {
    placeholder: '',
    disabled: false,
    action: 'directory'
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const onButton = async (): Promise<void> => {
  if (props.action === 'reveal') {
    await revealLocalPath(props.modelValue, '找不到这个文件夹，可能已被删除或移动')
    return
  }

  const next = await emitter.invoke('open-file-dialog', {
    title: '选择目录',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: props.modelValue,
    buttonLabel: '选择'
  })
  if (next) emit('update:modelValue', next)
}
</script>
