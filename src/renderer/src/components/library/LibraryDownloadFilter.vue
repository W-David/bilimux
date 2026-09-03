<template>
  <ToggleGroup
    type="single"
    size="sm"
    variant="outline"
    class="no-drag h-8"
    :model-value="model"
    @update:model-value="onChange">
    <ToggleGroupItem
      v-for="option in LIBRARY_DOWNLOAD_FILTERS"
      :key="option.value"
      :value="option.value"
      class="h-8 px-2.5 text-xs">
      {{ option.label }}
    </ToggleGroupItem>
  </ToggleGroup>
</template>

<script setup lang="ts">
import { LIBRARY_DOWNLOAD_FILTERS, type LibraryDownloadFilter } from '@shared/library-filter'
import { computed } from 'vue'

const props = defineProps<{
  modelValue: LibraryDownloadFilter
}>()

const emit = defineEmits<{
  'update:modelValue': [value: LibraryDownloadFilter]
}>()

const model = computed(() => props.modelValue)

const onChange = (value: string | string[] | undefined): void => {
  if (typeof value !== 'string') return
  if (!LIBRARY_DOWNLOAD_FILTERS.some(option => option.value === value)) return
  emit('update:modelValue', value as LibraryDownloadFilter)
}
</script>
