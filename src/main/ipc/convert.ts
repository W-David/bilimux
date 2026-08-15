import type Application from '../Application'
import { assertAllowedPath, getAllowedUserRoots } from '../utils/allowed-path'

export function registerConvertIpc(app: Application): void {
  app.ipcManager.mainIpc.handle('start:process', async () => {
    return app.composEngine.run()
  })

  app.ipcManager.mainIpc.handle('convert:scan', async () => {
    return app.composEngine.scan()
  })

  app.ipcManager.mainIpc.handle('convert:start', async (_, bvids: string[]) => {
    return app.composEngine.start(bvids)
  })

  app.ipcManager.mainIpc.handle('convert:cancel', () => {
    app.composEngine.cancel()
  })

  app.ipcManager.mainIpc.handle('check-engine', async () => {
    return app.composEngine.checkEngine()
  })

  app.ipcManager.mainIpc.handle('convert:history:list', () => {
    return app.convertHistoryStore.list()
  })

  app.ipcManager.mainIpc.handle('convert:history:remove', (_, id: number) => {
    const record = app.convertHistoryStore.getOutputPathById(id)
    if (record) {
      const roots = getAllowedUserRoots(app.configManager, app.context.platform)
      assertAllowedPath(record, roots, '转换产物路径')
    }
    app.convertHistoryStore.removeById(id)
  })

  app.ipcManager.mainIpc.handle('convert:history:clear', () => {
    app.convertHistoryStore.clear()
  })
}
