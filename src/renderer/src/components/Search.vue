<template>
  <div
    w="full"
    flex="~ items-center justify-between"
    border="0 rounded-xl"
    shadow="lg"
    bg="dark-500">
    <input
      v-model="searchText"
      type="text"
      class="flex-1"
      w="full"
      h="16"
      p="x-2"
      m="x-2"
      border="0 rounded-xl"
      bg="transparent"
      text="light 5"
      outline="none"
      @keyup.enter="emit('search', searchText)" />
    <div
      cursor="pointer"
      flex="~ items-center justify-center"
      h="12"
      w="12"
      m="2"
      border="0 rounded-xl"
      bg="pink/15"
      color="pink"
      transition="all 300"
      hover="ring-1 ring-pink -translate-[1px]"
      @click="emit('search', searchText)">
      <div class="i-mdi-search"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const searchText = ref('')
const emit = defineEmits<{
  (e: 'search', value: string): void
}>()
</script>
