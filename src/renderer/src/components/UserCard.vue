<template>
  <div class="min-w-0 flex items-center gap-3">
    <Avatar
      v-if="userFace"
      size="lg">
      <AvatarImage
        :src="safeCover(userFace)"
        alt="" />
      <AvatarFallback>{{ (userName || 'Bili').slice(0, 1) }}</AvatarFallback>
    </Avatar>
    <Avatar
      v-else
      size="lg">
      <AvatarFallback>{{ (userName || 'Bili').slice(0, 1) }}</AvatarFallback>
    </Avatar>
    <div class="min-w-0">
      <div class="flex items-center gap-2">
        <span
          class="truncate text-base font-black"
          :class="
            nicknameStyle ? 'text-[#f6f6f6]' : 'from-pink-400 to-sky-400 bg-linear-to-r bg-clip-text text-transparent'
          "
          :style="nicknameStyle">
          {{ userName || 'Bili' }}
        </span>
        <span
          v-if="userLevel !== undefined"
          class="shrink-0 rounded-sm bg-pink-400/15 px-1.5 py-0.5 text-[10px] text-pink-400 font-bold">
          LV{{ userLevel }}
        </span>
        <span
          v-if="isVip"
          class="shrink-0 rounded-sm bg-violet-400/15 px-1.5 py-0.5 text-[10px] text-violet-300 font-bold">
          {{ vipLabel }}
        </span>
        <span
          v-if="isSeniorMember"
          class="shrink-0 rounded-sm bg-sky-400/15 px-1.5 py-0.5 text-[10px] text-sky-300 font-bold">
          硬核会员
        </span>
      </div>
      <div
        v-if="userCoins !== undefined"
        class="mt-1 text-xs text-gray-400">
        {{ userCoins }} 硬币
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { safeCover } from '@renderer/utils/media'
import type { UserInfo } from '@shared/types'
import { computed } from 'vue'

const props = defineProps<{
  user: UserInfo | null
}>()

const userName = computed(() => props.user?.uname || '')
const userFace = computed(() => props.user?.face || '')
const userLevel = computed(() => props.user?.level_info?.current_level)
const isVip = computed(() => props.user?.vipStatus === 1)
const vipLabel = computed(() => props.user?.vip_label?.text || '大会员')
const isSeniorMember = computed(() => props.user?.is_senior_member === 1)
const userCoins = computed(() => props.user?.money)
const nicknameStyle = computed(() =>
  props.user?.vip_nickname_color ? { color: props.user.vip_nickname_color } : undefined
)
</script>
