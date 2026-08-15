import { BrowserWindow, shell } from 'electron'
import { dialog } from 'electron/main'
import type Application from '../Application'
import logger from '../core/Logger'
import { assertAllowedPath, getAllowedUserRoots } from '../utils/allowed-path'

export function registerAppIpc(app: Application): void {
  app.ipcManager.mainIpc.handle('open-file-dialog', (event, options) => {
    const parent = BrowserWindow.fromWebContents(event.sender)
    const openDialog = parent ? dialog.showOpenDialog(parent, options) : dialog.showOpenDialog(options)
    return openDialog
      .then(({ canceled, filePaths }) => (canceled ? '' : filePaths[0]))
      .catch(err => {
        const message = err instanceof Error ? err.message : String(err)
        logger.error(message)
        throw message
      })
  })

  app.ipcManager.mainIpc.handle('open-path', async (_, targetPath: string) => {
    const roots = getAllowedUserRoots(app.configManager, app.context.platform)
    const allowed = assertAllowedPath(targetPath, roots)
    return shell.openPath(allowed)
  })

  app.ipcManager.mainIpc.handle('open-folder', async (_, targetPath: string) => {
    const roots = getAllowedUserRoots(app.configManager, app.context.platform)
    const allowed = assertAllowedPath(targetPath, roots)
    shell.showItemInFolder(allowed)
  })

  app.ipcManager.mainIpc.handle('open-log-file', async () => {
    return shell.openPath(logger.transports.file.getFile().path)
  })

  app.ipcManager.mainIpc.handle('clear-log-file', () => {
    return logger.transports.file.getFile().clear()
  })

  app.ipcManager.mainIpc.handle('get-app-version', event => {
    app.updateManager.setSender(event.sender)
    return app.context.appVersion
  })

  app.ipcManager.mainIpc.handle('check-for-update', async event => {
    app.updateManager.setSender(event.sender)
    return app.updateManager.checkForUpdates()
  })

  app.ipcManager.mainIpc.handle('download-update', async () => {
    return app.updateManager.downloadUpdate()
  })

  app.ipcManager.mainIpc.handle('quit-and-install', async () => {
    return app.updateManager.quitAndInstall()
  })
}
