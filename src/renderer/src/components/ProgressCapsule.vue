<template>
  <div
    class="progress-capsule"
    :class="{
      'is-busy': busy,
      'is-paused': paused,
      'is-disabled': disabled,
      'is-sm': size === 'sm'
    }"
    :style="{ '--progress': `${clamped}%` }">
    <button
      type="button"
      class="progress-capsule__main"
      :disabled="disabled || !clickable"
      :aria-label="ariaLabel || displayText"
      @click="emit('click')">
      <span
        class="progress-capsule__fill"
        aria-hidden="true" />
      <span class="progress-capsule__content">
        <Spinner
          v-if="loading"
          class="size-3.5 text-white/90" />
        <template v-else>
          <component
            :is="icon"
            v-if="icon && !busy"
            class="size-3.5 shrink-0"
            :class="{ 'animate-spin': iconSpin }" />
          <span class="tabular-nums">{{ displayText }}</span>
        </template>
      </span>
    </button>
    <div
      v-if="cancellable"
      class="progress-capsule__cancel">
      <slot name="cancel">
        <button
          type="button"
          class="progress-capsule__x"
          aria-label="取消"
          @click.stop="emit('cancel')">
          <XIcon class="size-3.5" />
        </button>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X as XIcon } from '@lucide/vue'
import type { Component } from 'vue'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    label?: string
    percent?: number | null
    busy?: boolean
    paused?: boolean
    cancellable?: boolean
    clickable?: boolean
    disabled?: boolean
    loading?: boolean
    icon?: Component
    iconSpin?: boolean
    size?: 'sm' | 'md'
    ariaLabel?: string
  }>(),
  {
    label: '',
    percent: null,
    busy: false,
    paused: false,
    cancellable: false,
    clickable: true,
    disabled: false,
    loading: false,
    icon: undefined,
    iconSpin: false,
    size: 'md',
    ariaLabel: ''
  }
)

const emit = defineEmits<{
  click: []
  cancel: []
}>()

const clamped = computed(() => {
  if (props.percent == null) return 0
  return Math.min(100, Math.max(0, props.percent))
})

const displayText = computed(() => {
  if (props.busy && props.percent != null) return `${Math.round(clamped.value)}%`
  return props.label
})
</script>

<style scoped>
.progress-capsule {
  --progress: 0%;
  position: relative;
  isolation: isolate;
  display: inline-flex;
  flex-shrink: 0;
  height: 28px;
  min-width: 4.25rem;
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 999px;
  background: rgb(255 255 255 / 6%);
  transition:
    background-color 160ms ease,
    border-color 160ms ease;
}

.progress-capsule.is-sm {
  height: 26px;
  min-width: 3.75rem;
}

.progress-capsule:hover:not(.is-disabled) {
  border-color: rgb(255 255 255 / 16%);
  background: rgb(255 255 255 / 9%);
}

.progress-capsule.is-disabled {
  opacity: 0.45;
}

.progress-capsule__main {
  position: relative;
  z-index: 1;
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  border: 0;
  background: transparent;
  color: #e5e7eb;
  cursor: pointer;
}

.progress-capsule.is-busy .progress-capsule__main,
.progress-capsule.is-paused .progress-capsule__main {
  padding-right: 26px;
}

.progress-capsule__main:disabled {
  cursor: not-allowed;
}

.progress-capsule:not(.is-disabled) .progress-capsule__main:disabled {
  cursor: default;
}

.progress-capsule__main:focus-visible {
  outline: none;
}

.progress-capsule:focus-within {
  border-color: rgb(236 72 153 / 55%);
}

.progress-capsule__fill {
  position: absolute;
  inset: 0 auto 0 0;
  z-index: 0;
  width: var(--progress);
  background: rgb(236 72 153 / 35%);
  transition: width 200ms ease;
}

.progress-capsule.is-paused .progress-capsule__fill {
  background: rgb(148 163 184 / 28%);
}

.progress-capsule:not(.is-busy):not(.is-paused) .progress-capsule__fill {
  width: 0;
}

.progress-capsule__content {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
}

.progress-capsule.is-sm .progress-capsule__content {
  font-size: 11px;
}

.progress-capsule__cancel {
  position: absolute;
  top: 50%;
  right: 3px;
  z-index: 2;
  display: flex;
  width: 20px;
  height: 20px;
  transform: translateY(-50%);
}

.progress-capsule.is-sm .progress-capsule__cancel {
  width: 20px;
  height: 20px;
}

.progress-capsule__x,
.progress-capsule__cancel :deep(button) {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgb(156 163 175);
  cursor: pointer;
  transition:
    background-color 160ms ease,
    color 160ms ease;
}

.progress-capsule__x:hover,
.progress-capsule__cancel :deep(button:hover) {
  background: rgb(255 255 255 / 8%);
  color: #f87171;
}
</style>
