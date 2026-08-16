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
      class="h-11 w-11 flex select-none items-center justify-center rounded-xl transition-all duration-300"
      :class="
        isActive
          ? 'bg-pink-400/15 text-pink-400 ring-1 ring-pink-400/20'
          : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
      "
      @click="navigate">
      <component
        :is="icon"
        class="size-6" />
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
