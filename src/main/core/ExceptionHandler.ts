import { app, dialog } from 'electron'
import is from 'electron-is'

import logger from './Logger'

export default class ExceptionHandler {
  showDialog: boolean
  constructor() {
    this.showDialog = !is.dev()
    logger.info(this.constructor.name, 'inited')
  }

  setup(): void {
    if (is.dev()) {
      return
    }
    const showDialog = this.showDialog
    process.on('uncaughtException', err => {
      const { message, stack } = err
      logger.error(`UncaughtException: ${message}`)
      logger.error(stack)

      if (showDialog && app.isReady()) {
        dialog.showErrorBox('Error: ', message)
      }
    })
  }
}
