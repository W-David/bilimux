<template>
  <LoginGate
    v-if="!authStore.isAuthenticated"
    :title="catalog === 'cinema' ? '登录后查看追剧' : '登录后查看追番'" />
  <div
    v-else
    class="relative h-full min-h-0 grid grid-cols-[1fr_350px]">
    <div
      v-if="state.error && !state.loading"
      class="col-span-2 flex flex-col items-center justify-center gap-3">
      <p class="text-sm text-red-400">{{ state.error }}</p>
      <Button
        size="sm"
        variant="outline"
        @click="refresh">
        重试
      </Button>
    </div>
    <template v-else>
      <div class="relative min-h-0">
        <div
          ref="gridRoot"
          class="h-full overflow-y-auto px-4 py-4"
          @scroll="onGridScroll">
          <LibraryGridSkeleton
            v-if="state.loading && !state.items.length"
            poster
            :count="12" />
          <div
            v-else-if="!state.items.length"
            class="flex h-full items-center justify-center text-sm text-gray-500">
            {{ catalog === 'cinema' ? '暂无追剧' : '暂无追番' }}
          </div>
          <div
            v-else
            class="library-poster-grid">
            <BangumiPosterCard
              v-for="item in state.items"
              :key="item.seasonId"
              :item="item"
              :class="item.seasonId === selectedSeason?.seasonId ? 'ring-2 ring-pink-400/70 rounded-lg' : ''"
              @select="selectSeason" />
          </div>
          <LibraryGridSkeleton
            v-if="state.loadingMore"
            class="mt-4"
            poster
            :count="6" />
        </div>
        <button
          type="button"
          class="absolute right-4 bottom-4 z-10 flex size-11 cursor-pointer items-center justify-center rounded-full bg-[#2a2a2a] text-gray-200 shadow-lg shadow-black/40 hover:bg-[#333]"
          :disabled="state.loading"
          aria-label="刷新"
          @click="refresh">
          <RefreshCwIcon
            class="size-5"
            :class="state.loading ? 'animate-spin' : ''" />
        </button>
      </div>
      <aside class="min-h-0 overflow-hidden border-l border-[#1f1f1f] bg-[#141414] p-4 pr-0">
        <LibraryPreviewPanel
          :season="selectedSeason"
          :items="collection.items"
          :loading="collection.loading"
          :evaluate="evaluate" />
      </aside>
    </template>
  </div>
</template>

<script setup lang="ts">
import { RefreshCw as RefreshCwIcon } from '@lucide/vue'
import BangumiPosterCard from '@renderer/components/library/BangumiPosterCard.vue'
import LibraryGridSkeleton from '@renderer/components/library/LibraryGridSkeleton.vue'
import LibraryPreviewPanel from '@renderer/components/library/LibraryPreviewPanel.vue'
import LoginGate from '@renderer/components/library/LoginGate.vue'
import { useCollectionSource } from '@renderer/composables/useCollectionSource'
import { useAuthStore } from '@renderer/store/auth'
import { useLibraryStore, type LibraryTab } from '@renderer/store/library'
import type { BangumiFollowItem } from '@shared/types'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const authStore = useAuthStore()
const libraryStore = useLibraryStore()
const collection = reactive(useCollectionSource())
const selectedSeason = ref<BangumiFollowItem | null>(null)
const gridRoot = ref<HTMLElement | null>(null)

const catalog = computed<'bangumi' | 'cinema'>(() => (route.name === 'library-cinema' ? 'cinema' : 'bangumi'))
const tab = computed<LibraryTab>(() => catalog.value)
const state = computed(() => (catalog.value === 'cinema' ? libraryStore.cinema : libraryStore.bangumi))
const evaluate = computed(() => collection.selectedItem?.video.intro || collection.items[0]?.video.intro || '')

const selectSeason = (item: BangumiFollowItem): void => {
  selectedSeason.value = item
  collection.open({ type: 'bangumi', item, catalog: catalog.value })
}

const refresh = (): void => {
  void libraryStore.refreshTab(tab.value)
}

const onGridScroll = (): void => {
  const el = gridRoot.value
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
    void libraryStore.loadMore(tab.value)
  }
}

watch(tab, id => {
  selectedSeason.value = null
  collection.clear()
  if (authStore.isAuthenticated) void libraryStore.ensureTab(id)
})

watch(
  () => state.value.items,
  items => {
    if (!items.length) {
      selectedSeason.value = null
      collection.clear()
      return
    }
    if (!selectedSeason.value || !items.some(item => item.seasonId === selectedSeason.value?.seasonId)) {
      selectSeason(items[0])
    }
  },
  { immediate: true }
)

watch(
  () => authStore.isAuthenticated,
  ready => {
    if (ready) void libraryStore.ensureTab(tab.value)
  }
)

onMounted(() => {
  if (authStore.isAuthenticated) void libraryStore.ensureTab(tab.value)
})
</script>
