<template>
  <div class="relative h-full w-full flex flex-col overflow-hidden">
    <div class="flex shrink-0 items-center gap-5 px-5 pt-4 pb-3">
      <button
        v-for="item in tabs"
        :key="item.id"
        type="button"
        class="text-sm transition-colors"
        :class="tab === item.id ? 'text-pink-400' : 'text-gray-500 hover:text-gray-300'"
        @click="tab = item.id">
        {{ item.label }}
      </button>
    </div>

    <div
      ref="scrollRoot"
      class="min-h-0 flex-1 overflow-y-auto px-5 pb-20"
      @scroll="onScroll">
      <div
        v-if="state.error && !state.loading"
        class="flex h-full flex-col items-center justify-center gap-3">
        <p class="text-sm text-red-400">{{ state.error }}</p>
        <Button
          size="sm"
          variant="outline"
          @click="refresh">
          重试
        </Button>
      </div>

      <LibraryGridSkeleton
        v-else-if="state.loading && !state.items.length"
        :poster="isPosterTab"
        :count="isPosterTab ? 12 : 8" />

      <div
        v-else-if="!state.items.length"
        class="flex h-full items-center justify-center text-sm text-gray-500">
        {{ emptyText }}
      </div>

      <div
        v-else-if="tab === 'created'"
        class="library-folder-grid">
        <FolderCoverCard
          v-for="folder in folderItems"
          :key="folder.id"
          :folder="folder"
          @select="openFolder" />
      </div>

      <div
        v-else
        class="library-poster-grid">
        <BangumiPosterCard
          v-for="item in bangumiItems"
          :key="item.seasonId"
          :item="item"
          @select="openBangumi" />
      </div>

      <div
        v-if="state.loadingMore"
        class="mt-6">
        <LibraryGridSkeleton
          :poster="isPosterTab"
          :count="isPosterTab ? 6 : 4" />
      </div>
    </div>

    <button
      type="button"
      class="absolute right-5 bottom-5 flex size-11 cursor-pointer items-center justify-center rounded-full bg-[#2a2a2a] text-gray-200 shadow-lg shadow-black/40 hover:bg-[#333]"
      :disabled="state.loading"
      aria-label="刷新"
      @click="refresh">
      <RefreshCwIcon
        class="size-5"
        :class="state.loading ? 'animate-spin' : ''" />
    </button>

    <CollectionDialog
      :open="collectionOpen"
      :source="collectionSource"
      @update:open="collectionOpen = $event" />
  </div>
</template>

<script setup lang="ts">
import { RefreshCw as RefreshCwIcon } from '@lucide/vue'
import BangumiPosterCard from '@renderer/components/library/BangumiPosterCard.vue'
import CollectionDialog from '@renderer/components/library/CollectionDialog.vue'
import type { CollectionSource } from '@renderer/components/library/types'
import FolderCoverCard from '@renderer/components/library/FolderCoverCard.vue'
import LibraryGridSkeleton from '@renderer/components/library/LibraryGridSkeleton.vue'
import { useLibraryStore, type LibraryTab } from '@renderer/store/library'
import { usePreferenceStore } from '@renderer/store/preference'
import type { BangumiFollowItem, FavoriteFolder } from '@shared/types'
import { computed, onMounted, ref, watch } from 'vue'

const tabs: { id: LibraryTab; label: string }[] = [
  { id: 'created', label: '收藏' },
  { id: 'bangumi', label: '追番' },
  { id: 'cinema', label: '追剧' }
]

const libraryStore = useLibraryStore()
const preferenceStore = usePreferenceStore()
const tab = ref<LibraryTab>('created')
const scrollRoot = ref<HTMLElement | null>(null)
const collectionOpen = ref(false)
const collectionSource = ref<CollectionSource | null>(null)

const state = computed(() => libraryStore.pageOf(tab.value))
const isPosterTab = computed(() => tab.value === 'bangumi' || tab.value === 'cinema')
const folderItems = computed(() => libraryStore.created.items)
const bangumiItems = computed(() => (tab.value === 'bangumi' ? libraryStore.bangumi.items : libraryStore.cinema.items))
const emptyText = computed(() => {
  if (tab.value === 'created') return '暂无收藏夹'
  if (tab.value === 'bangumi') return '暂无追番'
  return '暂无追剧'
})

const refresh = (): void => {
  void libraryStore.refreshTab(tab.value)
}

const openFolder = (folder: FavoriteFolder): void => {
  collectionSource.value = { type: 'folder', folder }
  collectionOpen.value = true
}

const openBangumi = (item: BangumiFollowItem): void => {
  collectionSource.value = { type: 'bangumi', item, catalog: tab.value === 'cinema' ? 'cinema' : 'bangumi' }
  collectionOpen.value = true
}

const onScroll = (): void => {
  const el = scrollRoot.value
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
    void libraryStore.loadMore(tab.value)
  }
}

watch(tab, id => {
  void libraryStore.ensureTab(id)
  if (scrollRoot.value) scrollRoot.value.scrollTop = 0
})

onMounted(() => {
  if (preferenceStore.preference['favorites-data']) {
    preferenceStore.preference['favorites-data'] = null
    preferenceStore.savePreference()
  }
  void libraryStore.ensureTab(tab.value)
})
</script>
