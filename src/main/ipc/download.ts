import type Application from '../Application'

export function registerDownloadIpc(app: Application): void {
  app.ipcManager.mainIpc.handle('download:video', (_, task) => {
    app.downloadManager.start(task)
  })

  app.ipcManager.mainIpc.handle('download:pause', (_, bvid: string) => {
    app.downloadManager.pause(bvid)
  })

  app.ipcManager.mainIpc.handle('download:resume', (_, bvid: string) => {
    app.downloadManager.resume(bvid)
  })

  app.ipcManager.mainIpc.handle('download:history:list', (_, bvids: string[]) => {
    return app.downloadHistoryStore.getMany(bvids)
  })

  app.ipcManager.mainIpc.handle('download:history:get', (_, bvid: string) => {
    return app.downloadHistoryStore.getByBvid(bvid)
  })

  app.ipcManager.mainIpc.handle('download:history:clear', () => {
    app.downloadHistoryStore.clear()
  })
}
