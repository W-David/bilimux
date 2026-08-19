<template>
  <RouterLink
    v-slot="{ href, navigate, isActive }"
    :to="{ name: to }"
    custom>
    <a
      :href="href"
      :draggable="false"
      :title="label"
      :aria-label="label"
      class="no-drag w-full cursor-pointer rounded-xl px-1 py-2.5 flex select-none flex-col items-center gap-1 transition-all duration-300 [&_*]:pointer-events-none"
      :class="isActive ? ' text-pink-400' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'"
      @click="navigate">
      <component
        :is="icon"
        class="size-5" />
      <span class="text-[11px] leading-none">{{ label }}</span>
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
const label = computed(() => target.value.meta.menu?.label ?? '')
const icon = computed(() => target.value.meta.menu?.icon)
</script>
