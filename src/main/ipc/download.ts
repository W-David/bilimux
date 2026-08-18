import type Application from '../Application'
import { assertAllowedPath, getAllowedUserRoots } from '../utils/allowed-path'

export function registerDownloadIpc(app: Application): void {
  app.ipcManager.mainIpc.handle('download:video', (_, task) => {
    app.downloadManager.start(task)
  })

  app.ipcManager.mainIpc.handle('download:pause', (_, key) => {
    app.downloadManager.pause(key)
  })

  app.ipcManager.mainIpc.handle('download:resume', (_, key) => {
    app.downloadManager.resume(key)
  })

  app.ipcManager.mainIpc.handle('download:cancel', (_, key) => {
    app.downloadManager.cancel(key)
  })

  app.ipcManager.mainIpc.handle('download:history:list', (_, bvids?: string[]) => {
    if (bvids == null) {
      return app.downloadHistoryStore.listAll()
    }
    return app.downloadHistoryStore.getMany(bvids)
  })

  app.ipcManager.mainIpc.handle('download:history:get', (_, key) => {
    return app.downloadHistoryStore.getByKey(key)
  })

  app.ipcManager.mainIpc.handle('download:history:remove', (_, key, deleteFile?: boolean) => {
    const shouldDeleteFile = Boolean(deleteFile)
    if (shouldDeleteFile) {
      const outputPath = app.downloadHistoryStore.getOutputPath(key)
      if (outputPath) {
        const roots = getAllowedUserRoots(app.configManager, app.context.platform)
        assertAllowedPath(outputPath, roots, '下载产物路径')
      }
    }
    app.downloadHistoryStore.remove(key, shouldDeleteFile)
  })

  app.ipcManager.mainIpc.handle('download:history:clear', () => {
    app.downloadHistoryStore.clear()
  })
}
