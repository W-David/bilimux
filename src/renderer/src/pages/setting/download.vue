<template>
  <div class="flex flex-col gap-4 py-4">
    <div class="flex flex-col gap-3">
      <label class="font-normal">输出目录</label>
      <InputGroup>
        <InputGroupInput
          v-model="preference['download-config'].outputDir"
          placeholder="选择输出目录" />
        <InputGroupButton @click="selectDownloadOutputDir">
          <FolderOpenIcon />
        </InputGroupButton>
      </InputGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FolderOpen as FolderOpenIcon } from '@lucide/vue'
import { openFileDialog } from '@renderer/api'
import { usePreferenceStore } from '@renderer/store/preference'
import { storeToRefs } from 'pinia'

const store = usePreferenceStore()
const { preference } = storeToRefs(store)

const selectDownloadOutputDir = async (): Promise<void> => {
  const newPath = await openFileDialog({
    title: 'Select Directory',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: preference.value['download-config'].outputDir,
    buttonLabel: 'Select'
  })
  if (newPath) {
    preference.value['download-config'].outputDir = newPath
  }
}
</script>

<style scoped></style>
