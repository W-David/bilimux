<template>
  <div :class="gridClass">
    <div
      v-for="i in count"
      :key="i"
      class="flex flex-col gap-2">
      <div
        v-if="!isPoster"
        class="relative pt-3">
        <Skeleton class="absolute top-0 left-[8%] h-3 w-[84%] rounded-t-md" />
        <Skeleton class="absolute top-1.5 left-[4%] h-3 w-[92%] rounded-t-md" />
        <Skeleton class="relative aspect-video w-full rounded-lg" />
      </div>
      <Skeleton
        v-else
        class="aspect-2/3 w-full rounded-lg" />
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
    variant?: 'folder' | 'poster' | 'dialog'
  }>(),
  {
    count: 8,
    poster: false
  }
)

const isPoster = computed(() => props.variant === 'poster' || props.poster)

const gridClass = computed(() => {
  if (props.variant === 'dialog') return 'library-dialog-grid'
  if (isPoster.value) return 'library-poster-grid'
  return 'library-folder-grid'
})
</script>
