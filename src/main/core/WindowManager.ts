import { IpcRendererEvents } from '@shared/ipc/events'
import type { Pages } from '@shared/types'
import { app, BrowserWindow, Menu, nativeImage, shell, Tray, WebContents } from 'electron'
import is from 'electron-is'
import EventEmitter from 'node:events'
import path from 'node:path'
import { pages } from '../config/page'
import ConfigManager from './ConfigManager'
import IPCManager from './IPCManager'
import logger from './Logger'

type Windows = { [k: keyof Pages]: BrowserWindow | null }

export default class WindowManager extends EventEmitter {
  // windows 窗口集合
  windows: Windows
  // 程序 Quit 标识
  willQuit: boolean
  // 关闭窗口时是否隐藏到托盘（支持运行时切换）
  closeToHide: boolean
  // 全局配置管理
  configManager: ConfigManager
  // ipc通信管理
  ipcManager: IPCManager
  // 托盘实例（保持引用防止被 GC）
  tray: Tray | null

  constructor(configManager: ConfigManager, ipcManager: IPCManager) {
    super()

    this.configManager = configManager
    this.ipcManager = ipcManager
    this.windows = {}
    this.willQuit = false
    this.closeToHide = this.configManager.store.get('bind-close-to-hide') ?? true
    this.tray = null
    app.on('before-quit', () => {
      this.configManager.removeAllChangedListener()
      this.unbindWindowBlur()
      this.ipcManager.dispose()
      this.tray?.destroy()
      this.tray = null
      this.setWillQuit(true)
    })
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
    createdWindow.on('close', event => {
      if (this.closeToHide && !this.willQuit) {
        // 阻止默认的关闭行为，改为隐藏窗口
        event.preventDefault()

        if (createdWindow.isFullScreen()) {
          createdWindow.once('leave-full-screen', () => createdWindow.hide())
          createdWindow.setFullScreen(false)
        } else {
          createdWindow.hide()
        }
      }
    })

    if (this.configManager.store.get('auto-hide-window')) {
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

  /**
   * 设置关闭窗口时是否隐藏到托盘
   */
  setCloseToHide(value: boolean): void {
    this.closeToHide = value
  }

  /**
   * 初始化托盘（显示主窗口 / 退出），幂等
   */
  initTray(): void {
    if (this.tray) return

    const iconPath = is.dev()
      ? path.join(app.getAppPath(), 'resources', 'bilimux.png')
      : path.join(process.resourcesPath, 'resources', 'bilimux.png')
    // macOS 菜单栏按原始尺寸绘制图标，必须缩到标准大小（16x16），否则 1024x1024 的 Logo 会占满菜单栏
    const image = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    if (image.isEmpty()) {
      logger.warn(`托盘图标加载失败: ${iconPath}`)
      return
    }

    this.tray = new Tray(image)
    this.tray.setToolTip('BiliMux')
    this.tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: '显示主窗口',
          click: () => this.openWindow('main')
        },
        { type: 'separator' },
        {
          label: '退出',
          click: () => {
            this.setWillQuit(true)
            app.quit()
          }
        }
      ])
    )
    this.tray.on('click', () => this.openWindow('main'))
    logger.info('托盘已初始化')
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
    return Object.values(this.windows).filter(window => !!window)
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
    this.getWindowList().forEach(window => {
      this.ipcManager.mainEmitter.send(window.webContents, command, ...args)
    })
  }

  setWillQuit(value: boolean): void {
    this.willQuit = value
  }
}
