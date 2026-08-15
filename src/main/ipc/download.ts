import type Application from '../Application'

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

  app.ipcManager.mainIpc.handle('download:history:list', (_, bvids: string[]) => {
    return app.downloadHistoryStore.getMany(bvids)
  })

  app.ipcManager.mainIpc.handle('download:history:get', (_, key) => {
    return app.downloadHistoryStore.getByKey(key)
  })

  app.ipcManager.mainIpc.handle('download:history:clear', () => {
    app.downloadHistoryStore.clear()
  })
}
