<script setup lang="ts">
import type { AccordionTriggerProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { ChevronDownIcon } from '@lucide/vue'
import { reactiveOmit } from '@vueuse/core'
import { AccordionHeader, AccordionTrigger, useForwardProps } from 'reka-ui'
import { cn } from '@renderer/lib/utils'

const props = defineProps<AccordionTriggerProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')
const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <AccordionHeader class="flex">
    <AccordionTrigger
      v-slot="slotProps"
      data-slot="accordion-trigger"
      v-bind="forwarded"
      :class="
        cn(
          'flex flex-1 items-center justify-between gap-2 py-3 text-left text-xs text-gray-400 transition-all hover:text-gray-200 [&[data-state=open]>svg]:rotate-180',
          props.class
        )
      ">
      <slot v-bind="slotProps" />
      <ChevronDownIcon class="size-3.5 shrink-0 text-gray-500 transition-transform duration-200" />
    </AccordionTrigger>
  </AccordionHeader>
</template>
