<script setup lang="ts">
import { ChevronsRight as ChevronsRightIcon } from '@lucide/vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const menu = computed(() => route.meta.menu)
const subtitle = computed(() => {
  const description = menu.value?.description?.trim()
  if (description && description !== menu.value?.label) return description
  return route.meta.tab?.label ?? ''
})
</script>

<template>
  <div class="flex items-center justify-between gap-4 border-b border-border px-4 h-16 border-b-[#1f1f1f]">
    <div class="flex min-w-0 items-center gap-1">
      <ChevronsRightIcon class="size-6 shrink-0 text-muted-foreground" />
      <h1 class="min-w-0 truncate text-base font-semibold tracking-tight text-foreground">
        {{ subtitle }}
      </h1>
    </div>
    <div class="flex flex-none items-center gap-2">
      <slot></slot>
    </div>
  </div>
</template>
