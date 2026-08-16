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
  currentConvertRunId: string | null = null
  currentConvertOrder = new Map<string, number>()

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
    this.composEngine.on('process:item:start', data => {
      this.windowManager.sendCommandToAll('process:item:start', data)
      if (this.currentConvertRunId) {
        this.convertHistoryStore.markStarted(
          this.currentConvertRunId,
          data.bv,
          data.outputPath,
          this.currentConvertOrder.get(data.bv.bvid) ?? 0
        )
      }
    })
    this.composEngine.on('process:item:progress', data => {
      this.windowManager.sendCommandToAll('process:item:progress', data)
    })
    this.composEngine.on('process:item:end', data => {
      this.windowManager.sendCommandToAll('process:item:end', data)
      if (this.currentConvertRunId) {
        this.convertHistoryStore.markEnded(this.currentConvertRunId, data.bvid, {
          success: data.success,
          message: data.message,
          outputPath: data.outputPath,
          durationMs: data.durationMs,
          skipped: data.skipped
        })
      }
    })

    this.composEngine.on('process:start', () => {
      this.currentConvertRunId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      this.windowManager.sendCommandToAll('process:start')
    })
    this.composEngine.on('process:ready', data => {
      this.currentConvertOrder = new Map(data.bvs.map((bv, index) => [bv.bvid, index]))
      this.windowManager.sendCommandToAll('process:ready', data)
    })
    this.composEngine.on('process:broke', data => {
      this.windowManager.sendCommandToAll('process:broke', data)
    })
    this.composEngine.on('process:success', data => {
      this.windowManager.sendCommandToAll('process:success', data)
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
