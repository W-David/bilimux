import { app } from 'electron'
import logger from './Logger'

export default class AutoLauncher {
  enable() {
    const { openAtLogin } = app.getLoginItemSettings()
    if (openAtLogin) {
      return
    }
    app.setLoginItemSettings({ openAtLogin: true })
    logger.info('已设置开机自启')
  }
  disable() {
    const { openAtLogin } = app.getLoginItemSettings()
    if (!openAtLogin) {
      return
    }
    app.setLoginItemSettings({ openAtLogin: false })
    logger.info('已取消开机自启')
  }
}
