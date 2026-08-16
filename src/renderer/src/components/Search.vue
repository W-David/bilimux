<template>
  <div class="flex w-full items-center gap-2 rounded-full bg-[#1f1f1f] p-1">
    <input
      :value="modelValue"
      type="text"
      class="h-8 min-w-0 flex-1 bg-transparent indent-4 rounded-full text-sm text-[#f6f6f6] outline-none"
      :placeholder="placeholder"
      @input="onInput"
      @keyup.enter="emit('search', modelValue)" />
    <button
      type="button"
      class="flex h-8 w-20 cursor-pointer items-center justify-center rounded-full bg-pink-400/15 text-pink-400 hover:ring-1 hover:ring-pink-400"
      @click="emit('search', modelValue)">
      <SearchIcon class="size-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { Search as SearchIcon } from '@lucide/vue'

withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
  }>(),
  {
    placeholder: '搜索标题，或粘贴 BV / 视频链接'
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'search', value: string): void
}>()

const onInput = (event: Event): void => {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>
