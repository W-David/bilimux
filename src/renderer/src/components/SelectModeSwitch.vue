<template>
  <div
    class="relative h-8 w-36 shrink-0 overflow-hidden rounded-full p-1 card-glassy"
    role="tablist"
    aria-label="选择模式">
    <div
      class="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-pink-400/30 shadow-sm shadow-black/20"
      :class="multi ? 'select-mode-thumb-right' : 'select-mode-thumb-left'" />
    <div class="relative z-10 grid h-full grid-cols-2">
      <button
        type="button"
        role="tab"
        class="rounded-full text-xs transition-colors duration-300"
        :aria-selected="!multi"
        :class="multi ? 'text-gray-400' : 'text-pink-200'"
        @click="emit('update:modelValue', false)">
        单选
      </button>
      <button
        type="button"
        role="tab"
        class="rounded-full text-xs transition-colors duration-300"
        :aria-selected="multi"
        :class="multi ? 'text-pink-200' : 'text-gray-400'"
        @click="emit('update:modelValue', true)">
        多选
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const multi = computed(() => props.modelValue)
</script>

<style scoped>
.select-mode-thumb-left,
.select-mode-thumb-right {
  transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

.select-mode-thumb-left {
  transform: translateX(0);
}

.select-mode-thumb-right {
  transform: translateX(100%);
}
</style>
