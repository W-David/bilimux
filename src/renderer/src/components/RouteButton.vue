<template>
  <RouterLink
    v-slot="{ href, navigate, isActive }"
    :to="{ name: to }"
    custom>
    <a
      :href="href"
      :draggable="false"
      :class="[
        'relative flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-black/5 bg-[#121212] px-4 text-sm shadow-sm shadow-black/50 transition-all duration-300 text-zinc-400 hover:bg-[#202020] hover:text-white',
        isActive ? 'border-pink-500/20 bg-pink-500/10 text-pink-400!' : ''
      ]"
      @click="navigate">
      <component
        :is="icon"
        v-if="icon"
        class="size-4" />
      <span>{{ label }}</span>
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
