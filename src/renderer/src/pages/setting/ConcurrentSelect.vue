<template>
  <div class="flex items-center justify-between">
    <label class="font-normal">{{ label }}</label>
    <Select
      :model-value="String(modelValue)"
      @update:model-value="onChange">
      <SelectTrigger class="w-15">
        <SelectValue :placeholder="placeholder" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem
            v-for="option in CONCURRENT_OPTIONS"
            :key="option"
            :value="String(option)">
            {{ option }}
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  </div>
</template>

<script setup lang="ts">
import { clampConcurrent, CONCURRENT_OPTIONS } from '@shared/concurrent'

withDefaults(
  defineProps<{
    label: string
    modelValue: number
    placeholder?: string
  }>(),
  {
    placeholder: '选择并行任务数'
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const onChange = (value: string | number): void => {
  emit('update:modelValue', clampConcurrent(value))
}
</script>
