import type Application from '../Application'
import { registerAppIpc } from './app'
import { registerConvertIpc } from './convert'
import { registerDownloadIpc } from './download'
import { registerHttpIpc } from './http'
import { registerPreferenceIpc } from './preference'

export function registerIpcHandlers(app: Application): void {
  registerPreferenceIpc(app)
  registerConvertIpc(app)
  registerDownloadIpc(app)
  registerHttpIpc(app)
  registerAppIpc(app)
}
