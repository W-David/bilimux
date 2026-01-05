import { shell } from 'electron'
import { LogLevel } from 'electron-log'
import { dialog } from 'electron/main'
import AutoLauncher from './core/AutoLauncher'
import { ComposEngine } from './core/ComposEngine'
import ConfigManager from './core/ConfigManager'
import Context from './core/Context'
import IPCManager from './core/IPCManager'
import logger from './core/Logger'
import ProcessQueue from './core/ProcessQueue'
import UpdateManager from './core/UpdateManager'
import WindowManager from './core/WindowManager'

export default class Application {
  context: Context
  autoLauncher: AutoLauncher
  configManager: ConfigManager
  windowManager: WindowManager
  ipcManager: IPCManager
  composEngine: ComposEngine
  updateManager: UpdateManager
  processQueue: ProcessQueue<number>

  constructor() {
    this.context = new Context()

    this.autoLauncher = new AutoLauncher()

    this.configManager = new ConfigManager(this.context)

    this.setupLogger()

    this.ipcManager = new IPCManager()

    this.processQueue = new ProcessQueue({ concurrency: 1 })

    this.composEngine = new ComposEngine(this.processQueue, this.configManager)

    this.initComposEngine()

    this.windowManager = new WindowManager(this.configManager, this.ipcManager)

    this.updateManager = new UpdateManager()

    this.handleConfigEvents()

    this.handleIpcEvents()

    this.handleIpcInvoke()
  }

  setupLogger(): void {
    const logLevel = this.configManager.store.get('log-level')
    logger.transports.file.level = logLevel

    this.configManager.onChangedListener('log-level', nv => {
      logger.transports.file.level = nv as LogLevel
    })
  }

  initComposEngine(): void {
    this.composEngine.on('process:ready', data => {
      this.windowManager.sendCommandToAll('process:ready', data)
    })
    this.composEngine.on('process:item:start', data => {
      this.windowManager.sendCommandToAll('process:item:start', data)
    })
    this.composEngine.on('process:item:progress', data => {
      this.windowManager.sendCommandToAll('process:item:progress', data)
    })
    this.composEngine.on('process:item:end', data => {
      this.windowManager.sendCommandToAll('process:item:end', data)
    })
    this.composEngine.on('process:broke', data => {
      this.windowManager.sendCommandToAll('process:broke', data)
    })
    this.composEngine.on('process:success', data => {
      this.windowManager.sendCommandToAll('process:success', data)
    })
  }

  handleConfigEvents(): void {
    this.configManager.onChangedListener('open-at-login', val => {
      val ? this.autoLauncher.enable() : this.autoLauncher.disable()
    })
    this.configManager.onChangedListener('auto-hide-window', val => {
      val ? this.windowManager.bindWindowBlur() : this.windowManager.unbindWindowBlur()
    })
  }

  handleIpcEvents(): void {
    this.ipcManager.mainIpc.on('save-preference', (_, config) => {
      this.configManager.store.set(config)
      this.windowManager.sendCommandToAll('fetch-preference')
      logger.debug('preference saved')
    })
    this.ipcManager.mainIpc.on('reset-preference', () => {
      this.configManager.store.clear()
      this.windowManager.sendCommandToAll('fetch-preference')
      logger.debug('preference reseted')
    })
  }

  handleIpcInvoke(): void {
    this.ipcManager.mainIpc.handle('get-preference', async () => {
      const config = this.configManager.store.store
      return config
    })
    this.ipcManager.mainIpc.handle('open-file-dialog', (_, options) => {
      return new Promise((resolve, reject) => {
        dialog
          .showOpenDialog(options)
          .then(({ canceled, filePaths }) => {
            resolve(canceled ? '' : filePaths[0])
          })
          .catch(err => {
            const message = err instanceof Error ? err.message : String(err)
            logger.error(message)
            reject(message)
          })
      })
    })
    this.ipcManager.mainIpc.handle('start:process', async () => {
      return this.composEngine.run()
    })
    this.ipcManager.mainIpc.handle('open-path', async (_, path: string) => {
      return shell.openPath(path)
    })
    this.ipcManager.mainIpc.handle('open-folder', async (_, path: string) => {
      return shell.showItemInFolder(path)
    })
    this.ipcManager.mainIpc.handle('open-log-file', async () => {
      return shell.openPath(logger.transports.file.getFile().path)
    })
    this.ipcManager.mainIpc.handle('get-app-version', () => {
      return this.context['appVersion']
    })
    this.ipcManager.mainIpc.handle('check-for-update', async () => {
      return this.updateManager.checkForUpdates()
    })
    this.ipcManager.mainIpc.handle('download-update', async () => {
      return this.updateManager.downloadUpdate()
    })
    this.ipcManager.mainIpc.handle('quit-and-install', async () => {
      return this.updateManager.quitAndInstall()
    })
  }
}
