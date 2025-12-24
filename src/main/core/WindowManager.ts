import { app, BrowserWindow, shell, WebContents } from 'electron'
import is from 'electron-is'
import EventEmitter from 'node:events'
import { IpcRendererEvents } from '../../preload/ipcEvent'
import { pages } from '../config/page'
import type { Pages } from '../config/types'
import ConfigManager from './ConfigManager'
import IPCManager from './IPCManager'
import logger from './Logger'

type Windows = { [k: keyof Pages]: BrowserWindow | null }

export default class WindowManager extends EventEmitter {
  // windows 窗口集合
  windows: Windows
  // 程序 Quit 标识
  willQuit: boolean
  // 全局配置管理
  configManager: ConfigManager
  // ipc通信管理
  ipcManager: IPCManager

  constructor(configManager: ConfigManager, ipcManager: IPCManager) {
    super()

    this.configManager = configManager
    this.ipcManager = ipcManager
    this.windows = {}
    this.willQuit = false
    app.on('before-quit', () => {
      this.configManager.removeAllChangedListener()
      this.unbindWindowBlur()
      this.ipcManager.dispose()
      this.setWillQuit(true)
    })
    app.on('window-all-closed', () => {})

    logger.info(this.constructor.name, 'inited')
  }

  getPageOptions<T extends keyof Pages>(pageName: T): Pages[T] {
    const result = pages[pageName]

    // const { width, height } = screen.getPrimaryDisplay().workAreaSize
    // const widthScale = width >= 1280 ? 1 : 0.875
    // const heightScale = height >= 800 ? 1 : 0.875

    // result.attrs.width = result.attrs.width ? result.attrs.width * widthScale : 1280
    // result.attrs.height = result.attrs.height ? result.attrs.height * heightScale : 720

    return result
  }

  openWindow<T extends keyof Pages>(pageName: T): BrowserWindow {
    const existedWindow = this.windows[pageName]
    if (existedWindow) {
      existedWindow.show()
      existedWindow.focus()
      return existedWindow
    }

    const page = this.getPageOptions(pageName)
    const config = this.configManager.store.store

    const createdWindow = new BrowserWindow({ ...page.attrs })

    createdWindow.loadURL(page.url)

    // 开发模式打开 devtools
    if (is.dev() && page.openDevTools) {
      createdWindow.webContents.openDevTools({
        mode: 'undocked',
        activate: true
      })
    }

    // 默认程序运行后不显示，ready-to-show 后显示窗口
    createdWindow.once('ready-to-show', () => {
      createdWindow.show()
    })

    // 窗口关闭时的特殊处理
    createdWindow.on('close', (event) => {
      if (config['bind-close-to-hide'] && !this.willQuit) {
        // 组织默认的关闭行为
        event.preventDefault()

        if (createdWindow.isFullScreen()) {
          createdWindow.once('leave-full-screen', () => createdWindow.hide())
          createdWindow.setFullScreen(false)
        } else {
          createdWindow.hide()
        }
      }
    })

    if (config['auto-hide-window']) {
      this.bindWindowBlur()
    }

    // 窗口关闭后的处理
    createdWindow.on('closed', () => {
      this.windows[pageName] = null
    })

    //  阻止在应用中打开外链，外链使用默认浏览器打开
    createdWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
    })

    // 将创建的窗口对象添加到 窗口管理对象中
    this.windows[pageName] = createdWindow
    return createdWindow
  }

  toggleWindow(pageName: keyof Pages): void {
    const window = this.windows[pageName]
    if (!window) {
      return
    }
    if (!window.isVisible() || window.isFullScreen()) {
      window.show()
    } else {
      window.hide()
    }
  }

  showWindow(pageName: keyof Pages): void {
    const window = this.windows[pageName]
    if (!window) {
      logger.warn(`此窗口不存在: ${pageName}`)
      return
    }
    if (window.isVisible() && !window.isMinimized()) {
      return
    }
    window.show()
  }

  hideWindow(pageName: keyof Pages): void {
    const window = this.windows[pageName]
    if (!window) {
      return
    }
    if (!window.isVisible()) {
      return
    }
    window.hide()
  }

  onWindowBlur(_: Electron.Event, window: Electron.BrowserWindow) {
    window.hide()
  }

  bindWindowBlur() {
    app.on('browser-window-blur', this.onWindowBlur)
  }

  unbindWindowBlur() {
    app.removeListener('browser-window-blur', this.onWindowBlur)
  }

  getWindowList(): BrowserWindow[] {
    return Object.values(this.windows).filter((window) => !!window)
  }

  sendCommandTo<T extends keyof IpcRendererEvents>(
    webContents: WebContents,
    command: Extract<T, string>,
    ...args: IpcRendererEvents[T]
  ): void {
    this.ipcManager.mainEmitter.send(webContents, command, ...args)
  }

  sendCommandToAll<T extends keyof IpcRendererEvents>(
    command: Extract<T, string>,
    ...args: IpcRendererEvents[T]
  ): void {
    this.getWindowList().forEach((window) => {
      this.ipcManager.mainEmitter.send(window.webContents, command, ...args)
    })
  }

  getFocusedWindow(): BrowserWindow | null {
    return BrowserWindow.getFocusedWindow()
  }

  setWillQuit(value: boolean): void {
    this.willQuit = value
  }
}
