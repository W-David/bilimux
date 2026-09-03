<template>
  <div
    v-if="tabs.length"
    class="titlebar-end-pad draggable flex h-headbar shrink-0 items-stretch border-b border-secondary bg-background pl-4">
    <div class="flex h-full items-stretch">
      <HeadbarItem
        v-for="item in tabs"
        :key="String(item.name)"
        :to="String(item.name)" />
    </div>
    <div
      v-if="isLibrary"
      class="no-drag ml-auto flex h-full items-center pr-4">
      <LibraryDownloadFilter
        :model-value="libraryFilter"
        @update:model-value="onLibraryFilter" />
    </div>
    <div
      v-else-if="isTasks"
      class="no-drag ml-auto flex h-full items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        @click="openDownloadFolder">
        <FolderOpenIcon data-icon="inline-start" />
        下载目录
      </Button>
      <Button
        size="sm"
        variant="outline"
        @click="openConvertFolder">
        <FolderOpenIcon data-icon="inline-start" />
        转换目录
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FolderOpen as FolderOpenIcon } from '@lucide/vue'
import LibraryDownloadFilter from '@renderer/components/library/LibraryDownloadFilter.vue'
import { getChildTabs, sectionRecord } from '@renderer/router/utils'
import { useLibraryStore } from '@renderer/store/library'
import { usePreferenceStore } from '@renderer/store/preference'
import { openLocalPath } from '@renderer/utils/open-file'
import type { LibraryDownloadFilter as LibraryDownloadFilterValue } from '@shared/library-filter'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import HeadbarItem from './Item.vue'

const route = useRoute()
const preferenceStore = usePreferenceStore()
const libraryStore = useLibraryStore()

const section = computed(() => sectionRecord(route))
const tabs = computed(() => getChildTabs(section.value))
const isTasks = computed(() => section.value?.name === 'tasks')
const isLibrary = computed(() => section.value?.name === 'library')
const libraryFilter = computed(() => libraryStore.filterFor(route.name))

const onLibraryFilter = (value: LibraryDownloadFilterValue): void => {
  libraryStore.setFilter(route.name, value)
}

const openDir = async (dir: string): Promise<void> => {
  await openLocalPath(dir, '找不到这个文件夹，可能已被删除或移动')
}

const openDownloadFolder = (): void => {
  void openDir(preferenceStore.preference['download-config'].outputDir)
}

const openConvertFolder = (): void => {
  void openDir(preferenceStore.preference['convert-config'].outputDir)
}
</script>
