import { loadConfigFromNativeStore, saveConfigToNativeStore } from '@renderer/api'
import { defineStore } from 'pinia'
import { UserStore } from '@shared/types'
import { reactive, toRaw, watch } from 'vue'

interface UserPreference extends UserStore {}

export const usePreferenceStore = defineStore('preference', () => {
  const preference = reactive<UserPreference>({
    'convert-config': {
      cachePath: '',
      outputDir: '',
      gpacBinPath: '',
      forceTransform: false,
      forceComposition: false,
      concurrent: 1
    },
    'download-config': {
      outputDir: '',
      concurrent: 1,
      qn: 80,
      codec: 'avc'
    },
    'open-at-login': false,
    'auto-hide-window': false,
    'bind-close-to-hide': false,
    'log-level': 'verbose',
    'user-info': null,
    'favorites-data': null
  })

  let applyingRemote = false
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  async function fetchPreference(): Promise<UserPreference> {
    applyingRemote = true
    try {
      const config = await loadConfigFromNativeStore()
      Object.assign(preference, config)
      return preference
    } finally {
      applyingRemote = false
    }
  }

  function savePreference(): void {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    saveConfigToNativeStore(toRaw(preference))
  }

  function scheduleSave(): void {
    if (applyingRemote) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveTimer = null
      saveConfigToNativeStore(toRaw(preference))
    }, 300)
  }

  watch(preference, scheduleSave, { deep: true, flush: 'sync' })

  return { preference, fetchPreference, savePreference }
})
