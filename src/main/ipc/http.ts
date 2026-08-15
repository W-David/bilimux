import type Application from '../Application'
import { assertAllowedHttpUrl } from '../utils/allowed-url'
import { parseVideoType, resolveVideoMetaData } from '../utils/url'

export function registerHttpIpc(app: Application): void {
  app.ipcManager.mainIpc.handle('http-get-video-metadata', async (_, url: string) => {
    assertAllowedHttpUrl(url)
    const [type, errMsg] = parseVideoType(url)
    if (type) {
      const { html } = await app.httpClient.getHtml(url)
      return resolveVideoMetaData(html, type)
    }
    return [null, errMsg]
  })

  app.ipcManager.mainIpc.handle('http-get', async (_, url, options) => {
    assertAllowedHttpUrl(url)
    return app.httpClient.get(url, {
      searchParams: options?.searchParams,
      headers: options?.headers
    })
  })
}
