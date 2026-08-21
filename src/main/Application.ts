import { LogLevel } from 'electron-log'
import { clampConcurrent } from '@shared/concurrent'
import type { ConfigOptions, DownloadConfigOptions } from '@shared/types'
import AutoLauncher from './core/AutoLauncher'
import { ComposEngine, ConvertTaskResult } from './core/ComposEngine'
import ConfigManager from './core/ConfigManager'
import Context from './core/Context'
import ConvertHistoryStore from './core/ConvertHistoryStore'
import DownloadHistoryStore from './core/DownloadHistoryStore'
import DownloadManager from './core/DownloadManager'
import HttpClient from './core/HttpClient'
import IPCManager from './core/IPCManager'
import logger from './core/Logger'
import ProcessQueue from './core/ProcessQueue'
import UpdateManager from './core/UpdateManager'
import WindowManager from './core/WindowManager'
import { registerIpcHandlers } from './ipc'

export default class Application {
  context: Context
  autoLauncher: AutoLauncher
  configManager: ConfigManager
  windowManager: WindowManager
  ipcManager: IPCManager
  composEngine: ComposEngine
  updateManager: UpdateManager
  httpClient: HttpClient
  processQueue: ProcessQueue<ConvertTaskResult>
  convertHistoryStore: ConvertHistoryStore
  downloadHistoryStore: DownloadHistoryStore
  downloadManager: DownloadManager

  constructor() {
    this.context = new Context()

    this.autoLauncher = new AutoLauncher()

    this.configManager = new ConfigManager(this.context)

    this.setupLogger()

    this.ipcManager = new IPCManager()

    this.httpClient = new HttpClient()

    this.downloadHistoryStore = new DownloadHistoryStore()
    this.convertHistoryStore = new ConvertHistoryStore()

    this.processQueue = new ProcessQueue({
      concurrency: clampConcurrent(this.configManager.getStore()['convert-config'].concurrent)
    })

    this.composEngine = new ComposEngine(this.processQueue, this.configManager, this.convertHistoryStore)

    this.initComposEngine()

    this.windowManager = new WindowManager(this.configManager, this.ipcManager)

    this.downloadManager = new DownloadManager(
      this.httpClient,
      this.configManager,
      this.composEngine,
      this.downloadHistoryStore
    )
    this.initDownloadEvents()

    this.updateManager = new UpdateManager()

    this.handleConfigEvents()

    registerIpcHandlers(this)

    logger.info('Application 启动完成')
  }

  /**
   * 窗口就绪后后台缓存扫描（含对账），不阻塞启动
   */
  public async prescanOnStartup(): Promise<void> {
    try {
      const result = await this.composEngine.prescan()
      this.windowManager.sendCommandToAll('convert:prescan:done', result)
    } catch (error) {
      logger.error('启动缓存扫描失败', error)
    }
  }

  setupLogger(): void {
    const logLevel = this.configManager.store.get('log-level')
    logger.transports.file.level = logLevel

    this.configManager.onChangedListener('log-level', nv => {
      logger.transports.file.level = nv as LogLevel
    })
  }

  initComposEngine(): void {
    this.composEngine.on('convert:item:start', data => {
      this.windowManager.sendCommandToAll('convert:item:start', data)
    })
    this.composEngine.on('convert:item:progress', data => {
      this.windowManager.sendCommandToAll('convert:item:progress', data)
    })
    this.composEngine.on('convert:item:end', data => {
      this.windowManager.sendCommandToAll('convert:item:end', data)
    })
    this.composEngine.on('convert:start', () => {
      this.windowManager.sendCommandToAll('convert:start')
    })
    this.composEngine.on('convert:ready', data => {
      this.windowManager.sendCommandToAll('convert:ready', data)
    })
    this.composEngine.on('convert:broke', data => {
      this.windowManager.sendCommandToAll('convert:broke', data)
    })
    this.composEngine.on('convert:success', data => {
      this.windowManager.sendCommandToAll('convert:success', data)
    })
  }

  initDownloadEvents(): void {
    this.downloadManager.on('download:item:start', data => {
      this.windowManager.sendCommandToAll('download:item:start', data)
    })
    this.downloadManager.on('download:item:progress', data => {
      this.windowManager.sendCommandToAll('download:item:progress', data)
    })
    this.downloadManager.on('download:item:end', data => {
      this.windowManager.sendCommandToAll('download:item:end', data)
    })
  }

  handleConfigEvents(): void {
    this.configManager.onChangedListener('open-at-login', val => {
      val ? this.autoLauncher.enable() : this.autoLauncher.disable()
    })
    this.configManager.onChangedListener('auto-hide-window', val => {
      val ? this.windowManager.bindWindowBlur() : this.windowManager.unbindWindowBlur()
    })
    this.configManager.onChangedListener('bind-close-to-hide', val => {
      this.windowManager.setCloseToHide(Boolean(val))
    })
    this.configManager.onChangedListener('convert-config', val => {
      const convertConfig = val as ConfigOptions
      this.processQueue.setConcurrency(clampConcurrent(convertConfig.concurrent))
    })
    this.configManager.onChangedListener('download-config', val => {
      const downloadConfig = val as DownloadConfigOptions
      this.downloadManager.setConcurrency(downloadConfig.concurrent)
    })
  }
}
