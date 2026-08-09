<template>
  <div class="h-full w-full overflow-hidden flex flex-col items-center justify-center">
    <div class="h-100 w-100 flex flex-col items-center">
      <Qrcode class="w-full flex-auto"></Qrcode>
    </div>
  </div>
</template>

<script setup lang="ts">
import Qrcode from '@renderer/components/Qrcode.vue'
</script>
