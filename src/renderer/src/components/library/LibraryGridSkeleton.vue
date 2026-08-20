<template>
  <div :class="gridClass">
    <div
      v-for="i in count"
      :key="i"
      class="flex flex-col gap-2">
      <Skeleton
        v-if="isPoster"
        class="aspect-2/3 w-full rounded-lg" />
      <Skeleton
        v-else
        class="aspect-video w-full rounded-lg" />
      <Skeleton class="h-4 w-4/5" />
      <Skeleton class="h-3 w-2/5" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    count?: number
    poster?: boolean
    variant?: 'poster' | 'video'
  }>(),
  {
    count: 8,
    poster: false
  }
)

const isPoster = computed(() => props.variant === 'poster' || props.poster)

const gridClass = computed(() => (isPoster.value ? 'library-poster-grid' : 'library-video-grid'))
</script>
