import type Application from '../Application'
import { assertAllowedHttpUrl } from '../utils/allowed-url'

export function registerHttpIpc(app: Application): void {
  app.ipcManager.mainIpc.handle('http-get', async (_, url, options) => {
    assertAllowedHttpUrl(url)
    return app.httpClient.get(url, {
      searchParams: options?.searchParams,
      headers: options?.headers
    })
  })
}
