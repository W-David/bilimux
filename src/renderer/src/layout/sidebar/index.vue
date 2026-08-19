<template>
  <div class="h-full bg-[#1f1f1f]">
    <div class="h-full flex flex-col items-center px-2 pb-4 pt-14">
      <div class="flex w-full flex-col items-center gap-2">
        <SidebarItem
          v-for="item in menus"
          :key="String(item.name)"
          :to="String(item.name)" />
      </div>
      <div class="flex-1"></div>
      <button
        type="button"
        class="no-drag w-full cursor-pointer rounded-xl px-1 py-2.5 flex flex-col items-center gap-3 text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200 **:pointer-events-none"
        :aria-label="identityLabel"
        @click="onIdentityClick">
        <Avatar
          v-if="userFace"
          class="size-8">
          <AvatarImage
            :src="safeCover(userFace)"
            alt="" />
          <AvatarFallback>{{ identityInitial }}</AvatarFallback>
        </Avatar>
        <span
          v-else
          class="size-8 flex items-center justify-center rounded-full border border-white/10 bg-[#2a2a2a] text-[11px] text-gray-300">
          {{ identityInitial }}
        </span>
        <span
          class="max-w-full truncate text-[12px] leading-none"
          :class="authStore.isAuthenticated ? 'text-gray-300' : 'text-pink-400'">
          {{ identityLabel }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getChildMenus } from '@renderer/router/utils'
import { useAuthStore } from '@renderer/store/auth'
import { usePreferenceStore } from '@renderer/store/preference'
import { safeCover } from '@renderer/utils/media'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import SidebarItem from './Item.vue'

const router = useRouter()
const authStore = useAuthStore()
const preferenceStore = usePreferenceStore()
const main = router.getRoutes().find(record => record.name === 'main')
const menus = getChildMenus(main)

const user = computed(() => preferenceStore.preference['user-info'])
const userFace = computed(() => user.value?.face || '')
const identityLabel = computed(() => (authStore.isAuthenticated ? user.value?.uname || '已登录' : '登录'))
const identityInitial = computed(() => (identityLabel.value === '登录' ? '未' : identityLabel.value.slice(0, 1)))

const onIdentityClick = (): void => {
  if (authStore.isAuthenticated) {
    authStore.openProfile()
    return
  }
  authStore.openLogin()
}
</script>

<style lang="css" scoped></style>
