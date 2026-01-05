import { autoUpdater } from 'electron-updater'
import logger from './Logger'

export default class UpdateManager {
  constructor() {
    autoUpdater.logger = logger
    autoUpdater.autoDownload = false

    logger.info(this.constructor.name, 'inited')
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
