import is from 'electron-is'
import path from 'node:path'
import { pathToFileURL } from 'url'
import MainIcon from '../../../resources/icon.png?asset'
import { Pages } from './types'

const preloadPath = path.join(__dirname, '../preload/index.js')

export const pages: Pages = {
  // 主窗口
  main: {
    attrs: {
      icon: MainIcon,
      title: 'bilimux',
      width: 1024,
      height: 768,
      resizable: false,
      transparent: is.macOS(),
      vibrancy: is.macOS() ? 'fullscreen-ui' : undefined,
      visualEffectState: is.macOS() ? 'active' : undefined,
      titleBarStyle: 'hiddenInset', // macOS 上隐藏标题栏，仅显示交通灯按钮
      show: false, // 创建窗口时默认隐藏，等待 ready-to-show 事件后显示
      backgroundColor: '#000000ff', // 默认背景色
      webPreferences: {
        devTools: is.dev(),
        preload: preloadPath,
        contextIsolation: true, //启用上下文隔离
        sandbox: false
      }
    },
    openDevTools: true,
    url:
      is.dev() && process.env['ELECTRON_RENDERER_URL']
        ? process.env['ELECTRON_RENDERER_URL']
        : pathToFileURL(path.join(__dirname, '../renderer/index.html')).href
  }
}
