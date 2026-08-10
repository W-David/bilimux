import { shell } from 'electron'
import { LogLevel } from 'electron-log'
import { dialog } from 'electron/main'
import type { DownloadConfigOptions } from '@shared/types'
import AutoLauncher from './core/AutoLauncher'
import { ComposEngine, ConvertTaskResult } from './core/ComposEngine'
import ConfigManager from './core/ConfigManager'
import Context from './core/Context'
import ConvertHistoryStore from './core/ConvertHistoryStore'
import DownloadHistoryStore from './core/DownloadHistoryStore'
import DownloadManager from './core/DownloadManager'
import type { HttpGetJson, HttpPostJson } from './core/HttpClient'
import HttpClient from './core/HttpClient'
import IPCManager from './core/IPCManager'
import logger from './core/Logger'
import ProcessQueue from './core/ProcessQueue'
import UpdateManager from './core/UpdateManager'
import WindowManager from './core/WindowManager'
import { parseVideoType, resolveVideoMetaData } from './utils/url'

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

    this.processQueue = new ProcessQueue({ concurrency: 1 })

    this.composEngine = new ComposEngine(this.processQueue, this.configManager)

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

    this.handleIpcEvents()

    this.handleIpcInvoke()

    logger.info('Application 启动完成')
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
    this.configManager.onChangedListener('download-config', val => {
      const downloadConfig = val as DownloadConfigOptions
      this.downloadManager.setConcurrency(downloadConfig.concurrent)
    })
  }

  handleIpcEvents(): void {
    this.ipcManager.mainIpc.on('save-preference', (_, config) => {
      // Cookie 已由 HttpClient 独立管理（cookies.json），配置里不再包含该字段
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
    this.ipcManager.mainIpc.handle('clear-log-file', () => {
      return logger.transports.file.getFile().clear()
    })
    this.ipcManager.mainIpc.handle('get-app-version', event => {
      this.updateManager.setSender(event.sender)
      return this.context['appVersion']
    })
    this.ipcManager.mainIpc.handle('check-for-update', async event => {
      this.updateManager.setSender(event.sender)
      return this.updateManager.checkForUpdates()
    })
    this.ipcManager.mainIpc.handle('download-update', async () => {
      return this.updateManager.downloadUpdate()
    })
    this.ipcManager.mainIpc.handle('quit-and-install', async () => {
      return this.updateManager.quitAndInstall()
    })
    this.ipcManager.mainIpc.handle('check-engine', async () => {
      return this.composEngine.checkEngine()
    })
    this.ipcManager.mainIpc.handle('download:video', (_, task) => {
      this.downloadManager.start(task)
    })
    this.ipcManager.mainIpc.handle('download:pause', (_, bvid: string) => {
      this.downloadManager.pause(bvid)
    })
    this.ipcManager.mainIpc.handle('download:resume', (_, bvid: string) => {
      this.downloadManager.resume(bvid)
    })
    this.ipcManager.mainIpc.handle('download:history:list', (_, bvids: string[]) => {
      return this.downloadHistoryStore.getMany(bvids)
    })
    this.ipcManager.mainIpc.handle('download:history:get', (_, bvid: string) => {
      return this.downloadHistoryStore.getByBvid(bvid)
    })
    this.ipcManager.mainIpc.handle('download:history:clear', () => {
      this.downloadHistoryStore.clear()
    })
    this.ipcManager.mainIpc.handle('persist-cookie', async () => {
      await this.httpClient.saveCookieJar()
    })
    this.ipcManager.mainIpc.handle('get-cookie', async (_, key: string) => {
      const cookie = await this.httpClient.getCookieKey(key)
      return cookie
    })
    this.ipcManager.mainIpc.handle('logout', () => {
      return this.httpClient.logout()
    })
    this.ipcManager.mainIpc.handle('convert:history:list', () => {
      return this.convertHistoryStore.list()
    })
    this.ipcManager.mainIpc.handle('convert:history:remove', (_, bvid: string, filePath?: string) => {
      this.convertHistoryStore.remove(bvid, filePath)
    })
    this.ipcManager.mainIpc.handle('convert:history:clear', () => {
      this.convertHistoryStore.clear()
    })
    this.ipcManager.mainIpc.handle('http-get-video-metadata', async (_, url: string) => {
      const [type, errMsg] = parseVideoType(url)
      if (type) {
        const { html } = await this.httpClient.getHtml(url)
        return resolveVideoMetaData(html, type)
      } else {
        return [null, errMsg]
      }
    })
    this.ipcManager.mainIpc.handle('http-get', async (_, ...params: Parameters<HttpGetJson>) => {
      return this.httpClient.get(...params)
    })
    this.ipcManager.mainIpc.handle('http-post', async (_, ...params: Parameters<HttpPostJson>) => {
      return this.httpClient.post(...params)
    })
  }
}
