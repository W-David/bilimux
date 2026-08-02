<template>
  <div
    class="h-full w-full overflow-hidden"
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
