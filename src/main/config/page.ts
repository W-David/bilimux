import { Pages } from '@shared/types'
import { app } from 'electron'
import path from 'node:path'
import { pathToFileURL } from 'url'

const preloadPath = path.join(__dirname, '../preload/index.js')
const isDev = !app.isPackaged
const isMac = process.platform === 'darwin'
const isWin = process.platform === 'win32'

const chromeAttrs = isMac
  ? {
      transparent: true,
      vibrancy: 'fullscreen-ui' as const,
      visualEffectState: 'active' as const,
      titleBarStyle: 'hiddenInset' as const
    }
  : isWin
    ? {
        titleBarStyle: 'hidden' as const,
        titleBarOverlay: {
          color: '#181818',
          symbolColor: '#e5e7eb',
          height: 32
        }
      }
    : {}

export const pages: Pages = {
  // 主窗口
  main: {
    attrs: {
      title: 'bilimux',
      width: 1440,
      height: 1000,
      minWidth: 1280,
      minHeight: 800,
      resizable: true,
      show: false,
      backgroundColor: '#181818',
      ...chromeAttrs,
      webPreferences: {
        devTools: isDev,
        preload: preloadPath,
        contextIsolation: true,
        sandbox: false
      }
    },
    openDevTools: true,
    url:
      isDev && process.env['ELECTRON_RENDERER_URL']
        ? process.env['ELECTRON_RENDERER_URL']
        : pathToFileURL(path.join(__dirname, '../renderer/index.html')).href
  }
}
