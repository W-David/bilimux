import { IpcRendererEvents } from '@shared/ipc/events'
import type { Pages } from '@shared/types'
import { app, BrowserWindow, Menu, nativeImage, shell, Tray } from 'electron'
import path from 'node:path'
import { pages } from '../config/page'
import ConfigManager from './ConfigManager'
import IPCManager from './IPCManager'
import logger from './Logger'

type Windows = { [k: keyof Pages]: BrowserWindow | null }

export default class WindowManager {
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
  // 失焦隐藏是否已绑定，避免 openWindow / 配置变更重复注册
  private windowBlurBound: boolean

  constructor(configManager: ConfigManager, ipcManager: IPCManager) {
    this.configManager = configManager
    this.ipcManager = ipcManager
    this.windows = {}
    this.willQuit = false
    this.closeToHide = this.configManager.store.get('bind-close-to-hide') ?? true
    this.tray = null
    this.windowBlurBound = false
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
    return pages[pageName]
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
    if (!app.isPackaged && page.openDevTools) {
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

    const appUrl = page.url
    createdWindow.webContents.on('will-navigate', (event, url) => {
      if (!isAllowedNavigation(url, appUrl)) {
        event.preventDefault()
      }
    })
    createdWindow.webContents.on('will-redirect', (event, url) => {
      if (!isAllowedNavigation(url, appUrl)) {
        event.preventDefault()
      }
    })
    createdWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https://')) {
        void shell.openExternal(url)
      }
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

    const iconPath = app.isPackaged
      ? path.join(process.resourcesPath, 'resources', 'bilimux.png')
      : path.join(app.getAppPath(), 'resources', 'bilimux.png')
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
    if (this.windowBlurBound) return
    app.on('browser-window-blur', this.onWindowBlur)
    this.windowBlurBound = true
  }

  unbindWindowBlur() {
    if (!this.windowBlurBound) return
    app.removeListener('browser-window-blur', this.onWindowBlur)
    this.windowBlurBound = false
  }

  getWindowList(): BrowserWindow[] {
    return Object.values(this.windows).filter(window => !!window)
  }

  sendCommandToAll<T extends keyof IpcRendererEvents>(
    command: Extract<T, string>,
    ...args: IpcRendererEvents[T]
  ): void {
    this.getWindowList().forEach(window => {
      if (window.isDestroyed() || window.webContents.isDestroyed()) return
      this.ipcManager.mainEmitter.send(window.webContents, command, ...args)
    })
  }

  setWillQuit(value: boolean): void {
    this.willQuit = value
  }
}

function isAllowedNavigation(url: string, appUrl: string): boolean {
  try {
    const next = new URL(url)
    const app = new URL(appUrl)
    if (next.protocol === 'file:' && app.protocol === 'file:') {
      return path.normalize(decodeURIComponent(next.pathname)) === path.normalize(decodeURIComponent(app.pathname))
    }
    return next.origin === app.origin
  } catch {
    return false
  }
}
