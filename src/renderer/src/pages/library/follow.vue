<template>
  <LibraryBrowser
    :login-title="catalog === 'cinema' ? '登录后查看追剧' : '登录后查看追番'"
    :error="state.error"
    :loading="state.loading"
    @retry="refresh"
    @refresh="refresh"
    @grid-end="libraryStore.loadMore(tab)">
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
        :selected="item.seasonId === selectedSeason?.seasonId"
        @select="selectSeason" />
    </div>
    <LibraryGridSkeleton
      v-if="state.loadingMore"
      class="mt-4"
      poster
      :count="6" />

    <template #preview>
      <LibraryPreviewPanel
        :season="selectedSeason"
        :items="collection.items"
        :loading="collection.loading"
        :evaluate="evaluate" />
    </template>
  </LibraryBrowser>
</template>

<script setup lang="ts">
import BangumiPosterCard from '@renderer/components/library/BangumiPosterCard.vue'
import LibraryBrowser from '@renderer/components/library/LibraryBrowser.vue'
import LibraryGridSkeleton from '@renderer/components/library/LibraryGridSkeleton.vue'
import LibraryPreviewPanel from '@renderer/components/library/LibraryPreviewPanel.vue'
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
