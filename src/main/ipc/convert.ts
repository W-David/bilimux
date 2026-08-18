import type Application from '../Application'
import { assertAllowedPath, getAllowedUserRoots } from '../utils/allowed-path'

export function registerConvertIpc(app: Application): void {
  app.ipcManager.mainIpc.handle('start:process', async () => {
    return app.composEngine.run()
  })

  app.ipcManager.mainIpc.handle('convert:prescan', async () => {
    return app.composEngine.prescan()
  })

  app.ipcManager.mainIpc.handle('check-engine', async () => {
    return app.composEngine.checkEngine()
  })

  app.ipcManager.mainIpc.handle('convert:history:list', () => {
    return app.convertHistoryStore.list()
  })

  app.ipcManager.mainIpc.handle('convert:history:remove', (_, bvid: string, deleteFile?: boolean) => {
    const shouldDeleteFile = Boolean(deleteFile)
    if (shouldDeleteFile) {
      const record = app.convertHistoryStore.getOutputPath(bvid)
      if (record) {
        const roots = getAllowedUserRoots(app.configManager, app.context.platform)
        assertAllowedPath(record, roots, '转换产物路径')
      }
    }
    app.convertHistoryStore.remove(bvid, shouldDeleteFile)
  })

  app.ipcManager.mainIpc.handle('convert:history:clear', () => {
    app.convertHistoryStore.clear()
  })
}
