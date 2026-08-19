<template>
  <RouterLink
    v-slot="{ href, navigate, isActive }"
    :to="{ name: to }"
    custom>
    <a
      :href="href"
      :draggable="false"
      class="no-drag relative flex h-full cursor-pointer items-center justify-center gap-2 px-5 text-sm transition-colors [&_*]:pointer-events-none"
      :class="isActive ? 'text-pink-400' : 'text-zinc-400 hover:text-gray-200'"
      @click="navigate">
      <component
        :is="icon"
        v-if="icon"
        class="size-4" />
      <span>{{ label }}</span>
      <span
        v-if="isActive"
        class="absolute inset-x-0 bottom-0 h-0.5 bg-pink-400" />
    </a>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  to: string
}>()

const router = useRouter()

const target = computed(() => router.resolve({ name: props.to }))
const label = computed(() => target.value.meta.tab?.label ?? '')
const icon = computed(() => target.value.meta.tab?.icon)
</script>
