<script setup lang="ts">
import type { AccordionContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { AccordionContent, useForwardProps } from 'reka-ui'
import { cn } from '@renderer/lib/utils'

const props = defineProps<AccordionContentProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')
const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <AccordionContent
    v-slot="slotProps"
    data-slot="accordion-content"
    v-bind="forwarded"
    :class="
      cn(
        'overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
        props.class
      )
    "
    :style="{ '--radix-accordion-content-height': 'var(--reka-accordion-content-height)' }">
    <div class="pb-3">
      <slot v-bind="slotProps" />
    </div>
  </AccordionContent>
</template>
