<template>
  <LoginGate
    v-if="!authStore.isAuthenticated"
    :title="loginTitle" />
  <div
    v-else
    class="relative h-full min-h-0 min-w-0 grid"
    :class="hasRail ? 'grid-cols-[232px_1fr_350px]' : 'grid-cols-[1fr_350px]'">
    <div
      v-if="error && !loading"
      class="flex flex-col items-center justify-center gap-3"
      :class="hasRail ? 'col-span-3' : 'col-span-2'">
      <p class="text-sm text-red-400">{{ error }}</p>
      <Button
        size="sm"
        variant="outline"
        @click="emit('retry')">
        重试
      </Button>
    </div>
    <template v-else>
      <slot name="rail" />
      <div class="relative min-h-0 min-w-0">
        <div
          ref="gridRoot"
          class="h-full overflow-x-hidden overflow-y-auto px-4 py-4"
          @scroll="onGridScroll">
          <slot />
        </div>
        <button
          type="button"
          class="absolute right-4 bottom-4 z-10 flex size-11 cursor-pointer items-center justify-center rounded-full bg-[#2a2a2a] text-gray-200 shadow-lg shadow-black/40 hover:bg-[#333]"
          :disabled="loading"
          aria-label="刷新"
          @click="emit('refresh')">
          <RefreshCwIcon
            class="size-5"
            :class="loading ? 'animate-spin' : ''" />
        </button>
      </div>
      <aside class="min-h-0 overflow-hidden border-l border-secondary bg-[#141414]">
        <slot name="preview" />
      </aside>
    </template>
  </div>
</template>

<script setup lang="ts">
import { RefreshCw as RefreshCwIcon } from '@lucide/vue'
import { useAuthStore } from '@renderer/store/auth'
import { computed, ref, useSlots } from 'vue'
import LoginGate from './LoginGate.vue'

defineProps<{
  loginTitle: string
  error?: string
  loading?: boolean
}>()

const emit = defineEmits<{
  retry: []
  refresh: []
  gridEnd: []
}>()

const authStore = useAuthStore()
const slots = useSlots()
const gridRoot = ref<HTMLElement | null>(null)
const hasRail = computed(() => typeof slots.rail === 'function')

const onGridScroll = (): void => {
  const el = gridRoot.value
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) emit('gridEnd')
}
</script>
