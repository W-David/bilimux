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
      genConfig: false
    },
    'download-config': {
      outputDir: '',
      concurrent: 1
    },
    'open-at-login': false,
    'auto-hide-window': false,
    'bind-close-to-hide': false,
    'log-level': 'verbose',
    'user-info': null,
    'favorites-data': null
  })

  // open-at-login, auto-hide-window 触发自动保存
  watch([() => preference['open-at-login'], () => preference['auto-hide-window']], () => {
    savePreference()
  })

  async function fetchPreference(): Promise<UserPreference> {
    const config = await loadConfigFromNativeStore()
    const assignPreference = Object.assign(preference, config)
    return assignPreference
  }

  function savePreference(): void {
    saveConfigToNativeStore(toRaw(preference))
  }

  return { preference, fetchPreference, savePreference }
})
