<template>
  <div class="w-full flex items-center justify-between rounded-xl shadow-lg bg-[#1f1f1f]">
    <input
      v-model="searchText"
      type="text"
      class="flex-1 w-full h-16 px-2 mx-2 rounded-xl bg-transparent text-[#f6f6f6] text-xl outline-none"
      @keyup.enter="emit('search', searchText)" />
    <div
      class="cursor-pointer flex items-center justify-center h-12 w-12 m-2 rounded-xl bg-pink-400/15 text-pink-400 transition-all duration-300 hover:ring-1 hover:ring-pink-400 hover:-translate-y-px"
      @click="emit('search', searchText)">
      <SearchIcon class="size-5" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search as SearchIcon } from '@lucide/vue'
import { ref } from 'vue'

const searchText = ref('')
const emit = defineEmits<{
  (e: 'search', value: string): void
}>()
</script>
