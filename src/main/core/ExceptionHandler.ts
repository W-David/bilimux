import { app, dialog } from 'electron'
import is from 'electron-is'

import logger from './Logger'

export default class ExceptionHandler {
  showDialog: boolean
  constructor() {
    this.showDialog = !is.dev()
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
    process.on('unhandledRejection', reason => {
      const error = reason instanceof Error ? reason : new Error(String(reason))
      logger.error(`UnhandledRejection: ${error.message}`)
      logger.error(error.stack)

      if (showDialog && app.isReady()) {
        dialog.showErrorBox('Error: ', error.message)
      }
    })
  }
}
