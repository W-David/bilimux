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
      v-if="isTasks"
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
import { getChildTabs, sectionRecord } from '@renderer/router/utils'
import { usePreferenceStore } from '@renderer/store/preference'
import { openLocalPath } from '@renderer/utils/open-file'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import HeadbarItem from './Item.vue'

const route = useRoute()
const preferenceStore = usePreferenceStore()

const section = computed(() => sectionRecord(route))
const tabs = computed(() => getChildTabs(section.value))
const isTasks = computed(() => section.value?.name === 'tasks')

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
