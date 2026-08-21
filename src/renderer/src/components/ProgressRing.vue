<template>
  <div
    class="flex items-center"
    :class="compact ? '' : 'gap-4'">
    <!-- 环形进度 -->
    <div
      class="relative shrink-0"
      :class="compact ? 'size-10' : 'size-12'">
      <svg
        class="size-full -rotate-90"
        viewBox="0 0 36 36">
        <circle
          cx="18"
          cy="18"
          r="15.9"
          fill="none"
          stroke-width="3"
          class="stroke-white/25" />
        <circle
          cx="18"
          cy="18"
          r="15.9"
          fill="none"
          stroke-width="3"
          stroke-linecap="round"
          class="stroke-pink-400 transition-all duration-300"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="dashOffset" />
      </svg>
      <span
        class="absolute inset-0 flex items-center justify-center font-semibold text-white"
        :class="compact ? 'text-[10px]' : 'text-[11px]'">
        {{ Math.round(percent) }}%
      </span>
    </div>

    <!-- 文字信息 -->
    <div
      v-if="title || description"
      class="min-w-0 flex-1">
      <div
        v-if="title"
        class="truncate text-sm font-medium text-gray-200">
        {{ title }}
      </div>
      <div
        v-if="description"
        class="mt-1 truncate text-xs text-gray-400">
        {{ description }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    percent?: number
    title?: string
    description?: string
    compact?: boolean
  }>(),
  {
    percent: 0,
    title: '',
    description: '',
    compact: false
  }
)

const circumference = 2 * Math.PI * 15.9
const dashOffset = computed(() => circumference * (1 - Math.min(100, Math.max(0, props.percent)) / 100))
</script>

<style scoped></style>
