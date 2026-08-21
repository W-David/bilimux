<template>
  <LibraryBrowser
    login-title="登录后查看收藏夹"
    :error="created.error"
    :loading="created.loading"
    @retry="refresh"
    @refresh="refresh"
    @grid-end="collection.loadMore()">
    <template #rail>
      <FolderRail
        :folders="created.items"
        :selected-id="selectedFolder?.id"
        :loading-more="created.loadingMore"
        @select="selectFolder"
        @load-more="libraryStore.loadMore('created')" />
    </template>

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
        :selected="item.key === collection.selectedKey"
        @select="collection.selectedKey = item.key" />
    </div>
    <LibraryGridSkeleton
      v-if="collection.loadingMore"
      class="mt-4"
      variant="video"
      :count="3" />

    <template #preview>
      <LibraryPreviewPanel :payload="collection.selectedItem" />
    </template>
  </LibraryBrowser>
</template>

<script setup lang="ts">
import FolderRail from '@renderer/components/library/FolderRail.vue'
import LibraryBrowser from '@renderer/components/library/LibraryBrowser.vue'
import LibraryGridSkeleton from '@renderer/components/library/LibraryGridSkeleton.vue'
import LibraryPreviewPanel from '@renderer/components/library/LibraryPreviewPanel.vue'
import VideoCoverCard from '@renderer/components/library/VideoCoverCard.vue'
import { useCollectionSource } from '@renderer/composables/useCollectionSource'
import { useAuthStore } from '@renderer/store/auth'
import { useLibraryStore } from '@renderer/store/library'
import { usePreferenceStore } from '@renderer/store/preference'
import type { FavoriteFolder } from '@shared/types'
import { computed, onActivated, onMounted, reactive, ref, watch } from 'vue'

const authStore = useAuthStore()
const libraryStore = useLibraryStore()
const preferenceStore = usePreferenceStore()
const collection = reactive(useCollectionSource())
const selectedFolder = ref<FavoriteFolder | null>(null)
const created = computed(() => libraryStore.created)

const loadTab = (): void => {
  if (!authStore.isAuthenticated) return
  if (!preferenceStore.preference['user-info']?.mid) return
  void libraryStore.ensureTab('created')
}

const selectFolder = (folder: FavoriteFolder): void => {
  selectedFolder.value = folder
  collection.open({ type: 'folder', folder })
}

const refresh = (): void => {
  void libraryStore.refreshTab('created')
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
  () => [authStore.isAuthenticated, preferenceStore.preference['user-info']?.mid] as const,
  loadTab
)

onMounted(loadTab)
onActivated(loadTab)
</script>
