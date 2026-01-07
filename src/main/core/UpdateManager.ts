import { WebContents } from 'electron'
import { autoUpdater } from 'electron-updater'
import logger from './Logger'

export default class UpdateManager {
  private sender: WebContents | null = null

  constructor() {
    autoUpdater.logger = logger
    autoUpdater.autoDownload = false

    this.setupListeners()
    logger.info(this.constructor.name, 'inited')
  }

  setSender(sender: WebContents) {
    this.sender = sender
  }

  private setupListeners() {
    autoUpdater.on('checking-for-update', () => {
      this.sender?.send('update:checking')
    })

    autoUpdater.on('update-available', info => {
      this.sender?.send('update:available', info)
    })

    autoUpdater.on('update-not-available', () => {
      this.sender?.send('update:not-available')
    })

    autoUpdater.on('error', err => {
      this.sender?.send('update:error', err.message)
    })

    autoUpdater.on('download-progress', progressObj => {
      this.sender?.send('update:progress', progressObj)
    })

    autoUpdater.on('update-downloaded', () => {
      this.sender?.send('update:downloaded')
    })
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
    return autoUpdater.downloadUpdate()
  }

  quitAndInstall() {
    autoUpdater.quitAndInstall()
  }
}
