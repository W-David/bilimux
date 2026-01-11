<template>
  <div
    class="h-full w-full flex flex-col items-center justify-center gap-2 rounded-md bg-zinc-950 p-6 backdrop-blur-md hover:shadow">
    <div class="w-full text-center">
      <p class="mt-1 text-sm text-gray-200">请在浏览器中登录 Bilibili，复制 Cookie 并粘贴到下方</p>
    </div>

    <div class="w-full">
      <Textarea
        v-model="cookieInput"
        auto-resize
        rows="5"
        class="w-full border-zinc-700 bg-zinc-900 text-sm text-gray-300 focus:border-pink-500 focus:ring-pink-500/20"
        placeholder="在此粘贴 Cookie (包含 SESSDATA 等关键字段)..." />
    </div>

    <div class="w-full flex flex-col gap-2">
      <Button
        label="验证并登录"
        icon="i-mdi-login"
        :loading="validating"
        class="w-full border-pink-500 bg-pink-500 hover:border-pink-600 hover:bg-pink-600"
        @click="handleLogin" />

      <Transition name="slide-down">
        <div
          v-if="errorMsg"
          class="flex items-center gap-2 rounded bg-red-400/10 p-2 text-xs text-red-400">
          <div class="i-mdi-alert-circle"></div>
          <span>{{ errorMsg }}</span>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { httpGet } from '@renderer/api'
import logger from 'electron-log/renderer'
import { ref } from 'vue'

const cookieInput = ref('')
const validating = ref(false)
const errorMsg = ref('')

const handleLogin = async () => {
  errorMsg.value = ''
  const cookieStr = cookieInput.value.trim()

  if (!cookieStr) {
    errorMsg.value = '请输入 Cookie'
    return
  }

  // 简单格式校验
  if (!cookieStr.includes('SESSDATA=')) {
    errorMsg.value = 'Cookie 中缺少 SESSDATA'
    return
  }

  validating.value = true

  try {
    const res = await httpGet('https://api.bilibili.com/x/web-interface/nav')
    if (res.code === 0 && res.data?.isLogin) {
      logger.debug('登录成功:', cookieStr)
    } else {
      logger.warn(`验证登录失败: 错误码(${res.code})`)
      errorMsg.value = 'Cookie 无效或已过期'
    }
  } catch (err) {
    errorMsg.value = `验证失败: ${err instanceof Error ? err.message : String(err)}`
  } finally {
    validating.value = false
  }
}
</script>

<style scoped></style>
