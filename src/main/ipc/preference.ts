import { clampDownloadCodec, clampDownloadQn } from '@shared/download'
import type { UserStore } from '@shared/types'
import type Application from '../Application'
import { getEngineBinPath } from '../utils'
import logger from '../core/Logger'

const PREFERENCE_KEYS = [
  'user-info',
  'favorites-data',
  'convert-config',
  'download-config',
  'open-at-login',
  'auto-hide-window',
  'bind-close-to-hide',
  'log-level'
] as const

function clampConcurrent(value: unknown): number {
  return Math.min(16, Math.max(1, Math.trunc(Number(value)) || 1))
}

function mergePreference(app: Application, incoming: UserStore): UserStore {
  const current = app.configManager.getStore()
  const engineBinPath = getEngineBinPath(app.context.platform)
  const convertIncoming = incoming['convert-config']
  const downloadIncoming = incoming['download-config']

  return {
    'user-info': 'user-info' in incoming ? incoming['user-info'] : current['user-info'],
    'favorites-data': 'favorites-data' in incoming ? incoming['favorites-data'] : current['favorites-data'],
    'convert-config': {
      ...current['convert-config'],
      ...(convertIncoming ?? {}),
      gpacBinPath: engineBinPath,
      concurrent: Math.min(
        8,
        Math.max(1, Math.trunc(Number(convertIncoming?.concurrent ?? current['convert-config'].concurrent)) || 1)
      )
    },
    'download-config': {
      ...current['download-config'],
      ...(downloadIncoming ?? {}),
      concurrent: clampConcurrent(downloadIncoming?.concurrent ?? current['download-config'].concurrent),
      qn: clampDownloadQn(downloadIncoming?.qn ?? current['download-config'].qn),
      codec: clampDownloadCodec(downloadIncoming?.codec ?? current['download-config'].codec)
    },
    'open-at-login': incoming['open-at-login'] ?? current['open-at-login'],
    'auto-hide-window': incoming['auto-hide-window'] ?? current['auto-hide-window'],
    'bind-close-to-hide': incoming['bind-close-to-hide'] ?? current['bind-close-to-hide'],
    'log-level': incoming['log-level'] ?? current['log-level']
  }
}

export function registerPreferenceIpc(app: Application): void {
  app.ipcManager.mainIpc.on('save-preference', (_, config) => {
    const merged = mergePreference(app, config)
    for (const key of PREFERENCE_KEYS) {
      app.configManager.store.set(key, merged[key])
    }
    app.windowManager.sendCommandToAll('fetch-preference')
    logger.debug('preference saved')
  })

  app.ipcManager.mainIpc.on('reset-preference', () => {
    app.configManager.store.clear()
    void app.httpClient.logout()
    app.windowManager.sendCommandToAll('fetch-preference')
    logger.debug('preference reseted')
  })

  app.ipcManager.mainIpc.handle('get-preference', async () => {
    return app.configManager.store.store
  })

  app.ipcManager.mainIpc.handle('persist-cookie', async () => {
    await app.httpClient.saveCookieJar()
  })

  app.ipcManager.mainIpc.handle('get-cookie', async () => {
    return app.httpClient.getCookieKey('bili_jct')
  })

  app.ipcManager.mainIpc.handle('logout', () => {
    return app.httpClient.logout()
  })
}
