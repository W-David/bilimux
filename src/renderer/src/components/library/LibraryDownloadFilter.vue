<template>
  <div
    class="flex items-center gap-2.5 select-none px-2"
    role="radiogroup"
    :aria-label="ariaLabel">
    <ListFilterIcon
      class="size-3.5 shrink-0 text-zinc-500"
      aria-hidden="true" />
    <div class="flex items-center gap-4">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        role="radio"
        class="cursor-pointer text-sm transition-colors"
        :aria-checked="option.value === model"
        :class="option.value === model ? 'text-pink-400' : 'text-zinc-400 hover:text-gray-200'"
        @click="onChange(option.value)">
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ListFilter as ListFilterIcon } from '@lucide/vue'
import {
  DEFAULT_LIBRARY_CACHE_FILTER,
  isLibraryCacheFilter,
  LIBRARY_CACHE_FILTERS,
  type LibraryCacheFilter
} from '@shared/library-filter'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: LibraryCacheFilter
    ariaLabel?: string
  }>(),
  {
    ariaLabel: '按转换状态筛选'
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: LibraryCacheFilter]
}>()

const options = LIBRARY_CACHE_FILTERS
const ariaLabel = computed(() => props.ariaLabel)

const model = computed(() => (isLibraryCacheFilter(props.modelValue) ? props.modelValue : DEFAULT_LIBRARY_CACHE_FILTER))

const onChange = (value: LibraryCacheFilter): void => {
  if (value === model.value) return
  emit('update:modelValue', value)
}
</script>
