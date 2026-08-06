<template>
  <div
    class="h-full w-full overflow-hidden"
    flex="~ col justify-center items-center">
    <div
      class="h-100 w-100"
      flex="~ col items-center">
      <Qrcode class="w-full flex-auto"></Qrcode>
    </div>
  </div>
</template>

<script setup lang="ts">
import Qrcode from '@renderer/components/Qrcode.vue'
</script>
