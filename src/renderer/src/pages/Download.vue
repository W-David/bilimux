<template>
  <div class="h-full w-full flex flex-col overflow-hidden">
    <!-- headbar -->
    <div class="h-18 w-full flex-none bg-transparent px-4 shadow backdrop-blur-2px">
      <div class="h-full w-full flex items-center justify-between p-3"></div>
    </div>

    <!-- content -->
    <div
      class="h-full w-full flex-1"
      flex="~ col justify-center items-center">
      <div
        class="h-100 w-100"
        flex="~ col items-center gap-3">
        <div class="w-full">
          <SelectButton
            v-model="selectedMethod"
            option-value="value"
            size="large"
            option-label="label"
            :options="selectOptions"
            fluid>
            <template #option="{ option }">
              <span :class="[option.icon, 'mr-1']"></span>
              <span>{{ option.label }}</span>
            </template>
          </SelectButton>
        </div>
        <div class="w-full flex-auto">
          <Qrcode v-if="selectedMethod === 'scan'"></Qrcode>
          <Cookie v-else></Cookie>
        </div>
      </div>
    </div>

    <!-- footbar -->
    <div class="h-18 w-full bg-transparent pl-4 shadow backdrop-blur-2px"></div>
  </div>
</template>

<script setup lang="ts">
import Cookie from '@renderer/components/Cookie.vue'
import Qrcode from '@renderer/components/Qrcode.vue'
import logger from 'electron-log/renderer'
import { onUnmounted, ref } from 'vue'

type Skey = 'scan' | 'cookie'

interface SelectOption {
  value: Skey
  icon: string
  label: string
}

const selectedMethod = ref<Skey>('scan')
const selectOptions: SelectOption[] = [
  { icon: 'i-mdi-qrcode', value: 'scan', label: '扫码登录' },
  { icon: 'i-mdi-cookie', value: 'cookie', label: 'cookie登录' }
]

logger.debug('Download created')
onUnmounted(() => {
  logger.debug('Download unmounted')
})
</script>
