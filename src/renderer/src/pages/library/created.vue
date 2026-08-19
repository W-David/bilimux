<template>
  <LoginGate
    v-if="!authStore.isAuthenticated"
    title="登录后查看收藏夹" />
  <div
    v-else
    class="relative h-full min-h-0 grid grid-cols-[232px_1fr_320px]">
    <div
      v-if="created.error && !created.loading"
      class="col-span-3 flex flex-col items-center justify-center gap-3">
      <p class="text-sm text-red-400">{{ created.error }}</p>
      <Button
        size="sm"
        variant="outline"
        @click="refresh">
        重试
      </Button>
    </div>
    <template v-else>
      <FolderRail
        :folders="created.items"
        :selected-id="selectedFolder?.id"
        :loading-more="created.loadingMore"
        @select="selectFolder"
        @load-more="libraryStore.loadMore('created')" />
      <div class="relative min-h-0">
        <div
          ref="gridRoot"
          class="h-full overflow-y-auto px-4 py-4"
          @scroll="onGridScroll">
          <LibraryGridSkeleton
            v-if="collection.loading && !collection.items.length"
            variant="video"
            :count="6" />
          <div
            v-else-if="collection.error"
            class="flex h-full flex-col items-center justify-center gap-3">
            <p class="text-sm text-red-400">{{ collection.error }}</p>
            <Button
              size="sm"
              variant="outline"
              @click="collection.retry()">
              重试
            </Button>
          </div>
          <div
            v-else-if="!collection.items.length"
            class="flex h-full items-center justify-center text-sm text-gray-500">
            {{ created.loading ? '' : '该收藏夹还没有内容' }}
          </div>
          <div
            v-else
            class="library-video-grid">
            <VideoCoverCard
              v-for="item in collection.items"
              :key="item.key"
              :video="item.video"
              :class="item.key === collection.selectedKey ? 'ring-2 ring-pink-400/70 rounded-lg' : ''"
              @select="collection.selectedKey = item.key" />
          </div>
          <LibraryGridSkeleton
            v-if="collection.loadingMore"
            class="mt-4"
            variant="video"
            :count="3" />
        </div>
        <button
          type="button"
          class="absolute right-4 bottom-4 z-10 flex size-11 cursor-pointer items-center justify-center rounded-full bg-[#2a2a2a] text-gray-200 shadow-lg shadow-black/40 hover:bg-[#333]"
          :disabled="created.loading"
          aria-label="刷新"
          @click="refresh">
          <RefreshCwIcon
            class="size-5"
            :class="created.loading ? 'animate-spin' : ''" />
        </button>
      </div>
      <aside class="min-h-0 overflow-hidden border-l border-[#1f1f1f] bg-[#141414] p-4">
        <LibraryPreviewPanel :payload="collection.selectedItem" />
      </aside>
    </template>
  </div>
</template>

<script setup lang="ts">
import { RefreshCw as RefreshCwIcon } from '@lucide/vue'
import FolderRail from '@renderer/components/library/FolderRail.vue'
import LibraryPreviewPanel from '@renderer/components/library/LibraryPreviewPanel.vue'
import LibraryGridSkeleton from '@renderer/components/library/LibraryGridSkeleton.vue'
import LoginGate from '@renderer/components/library/LoginGate.vue'
import VideoCoverCard from '@renderer/components/library/VideoCoverCard.vue'
import { useCollectionSource } from '@renderer/composables/useCollectionSource'
import { useAuthStore } from '@renderer/store/auth'
import { useLibraryStore } from '@renderer/store/library'
import type { FavoriteFolder } from '@shared/types'
import { computed, onMounted, reactive, ref, watch } from 'vue'

const authStore = useAuthStore()
const libraryStore = useLibraryStore()
const collection = reactive(useCollectionSource())
const selectedFolder = ref<FavoriteFolder | null>(null)
const gridRoot = ref<HTMLElement | null>(null)
const created = computed(() => libraryStore.created)

const selectFolder = (folder: FavoriteFolder): void => {
  selectedFolder.value = folder
  collection.open({ type: 'folder', folder })
}

const refresh = (): void => {
  void libraryStore.refreshTab('created')
}

const onGridScroll = (): void => {
  const el = gridRoot.value
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) collection.loadMore()
}

watch(
  () => created.value.items,
  folders => {
    if (!folders.length) {
      selectedFolder.value = null
      collection.clear()
      return
    }
    if (!selectedFolder.value || !folders.some(folder => folder.id === selectedFolder.value?.id)) {
      selectFolder(folders[0])
    }
  },
  { immediate: true }
)

watch(
  () => authStore.isAuthenticated,
  ready => {
    if (ready) void libraryStore.ensureTab('created')
  }
)

onMounted(() => {
  if (authStore.isAuthenticated) void libraryStore.ensureTab('created')
})
</script>
