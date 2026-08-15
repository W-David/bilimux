import { shell, WebContents } from 'electron'
import { autoUpdater, type UpdateInfo } from 'electron-updater'
import logger from './Logger'

/** macOS 未签名，检测到更新时直接引导用户去 GitHub 手动下载 */
const RELEASE_PAGE_URL = 'https://github.com/W-David/bilimux/releases/latest'

export default class UpdateManager {
  private sender: WebContents | null = null

  constructor() {
    autoUpdater.logger = logger
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = process.platform !== 'darwin'

    this.setupListeners()
  }

  setSender(sender: WebContents) {
    this.sender = sender
  }

  private sendToRenderer(channel: string, ...args: unknown[]): void {
    if (!this.sender || this.sender.isDestroyed()) return
    this.sender.send(channel, ...args)
  }

  private setupListeners() {
    autoUpdater.on('checking-for-update', () => {
      this.sendToRenderer('update:checking')
    })

    autoUpdater.on('update-available', info => {
      if (process.platform === 'darwin') {
        void this.openManualDownloadPage(info)
        return
      }
      this.sendToRenderer('update:available', info)
    })

    autoUpdater.on('update-not-available', () => {
      this.sendToRenderer('update:not-available')
    })

    autoUpdater.on('error', err => {
      this.sendToRenderer('update:error', err.message)
    })

    autoUpdater.on('download-progress', progressObj => {
      this.sendToRenderer('update:progress', progressObj)
    })

    autoUpdater.on('update-downloaded', () => {
      this.sendToRenderer('update:downloaded')
    })
  }

  private async openManualDownloadPage(info: UpdateInfo) {
    try {
      await shell.openExternal(RELEASE_PAGE_URL)
      this.sendToRenderer('update:manual-download', info)
    } catch (error) {
      logger.error('Open update download page failed:', error)
      this.sendToRenderer('update:error', error instanceof Error ? error.message : String(error))
    }
  }

  async checkForUpdates() {
    try {
      const result = await autoUpdater.checkForUpdates()
      return result
    } catch (error) {
      logger.error('Check for updates failed:', error)
      throw error
    }
  }

  downloadUpdate() {
    if (process.platform === 'darwin') {
      const error = new Error('macOS 请前往 GitHub 下载页面手动安装')
      this.sendToRenderer('update:error', error.message)
      return Promise.reject(error)
    }
    return autoUpdater.downloadUpdate()
  }

  quitAndInstall() {
    if (process.platform === 'darwin') {
      return
    }
    autoUpdater.quitAndInstall()
  }
}
