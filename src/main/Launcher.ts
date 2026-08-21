import { app, Menu } from 'electron'
import Application from './Application'
import ExceptionHandler from './core/ExceptionHandler'

export default class Launcher {
  application: Application
  exceptionHandler: ExceptionHandler
  constructor(application: Application) {
    this.application = application
    this.exceptionHandler = new ExceptionHandler()
    this.makeSingleInstance(() => this.init())
  }

  makeSingleInstance(callback: () => void): void {
    const lock = app.requestSingleInstanceLock()
    if (!lock) {
      app.quit()
      return
    }

    app.on('second-instance', () => {
      this.application.windowManager.openWindow('main')
    })
    callback && callback()
  }

  init(): void {
    // 启动程序异常处理
    this.exceptionHandler.setup()
    app.whenReady().then(() => {
      app.setAppUserModelId('com.rushwang.bilimux')
      if (process.platform !== 'darwin') {
        Menu.setApplicationMenu(null)
      }
      // 首次启动打开主窗口；macOS 的 activate 事件会复用同一窗口
      this.application.windowManager.openWindow('main')
      this.application.windowManager.initTray()
      void this.application.prescanOnStartup()
      app.on('activate', () => {
        this.application.windowManager.openWindow('main')
      })
    })
    app.on('window-all-closed', () => {
      if (this.application.context.platform !== 'darwin') {
        app.quit()
      }
    })
  }
}
