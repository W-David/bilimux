import { app } from 'electron'
import is from 'electron-is'
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
    if (is.macOS()) {
      callback && callback()
      return
    }

    const lock = app.requestSingleInstanceLock()
    if (!lock) {
      app.quit()
    } else {
      app.on('second-instance', () => {
        this.application.windowManager.openWindow('main')
      })
      callback && callback()
    }
  }

  init(): void {
    // 启动程序异常处理
    this.exceptionHandler.setup()
    app.whenReady().then(() => {
      app.setAppUserModelId('com.codyw.bilimux')
      globalThis.application = this.application
      app.on('activate', () => {
        globalThis.application.windowManager.openWindow('main')
      })
    })
    app.on('will-quit', () => {})
    app.on('window-all-closed', () => {
      if (this.application.context['platform'] === 'darwin') {
        app.quit()
      }
    })
  }
}
