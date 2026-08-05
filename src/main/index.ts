import { app } from 'electron'
import path from 'node:path'
import Application from './Application'
import Launcher from './Launcher'

function main(): void {
  if (!app.isPackaged) {
    app.setPath('userData', path.join(app.getPath('appData'), 'bilimux-dev'))
  }

  const application = new Application()
  const launcher = new Launcher(application)
  globalThis.launcher = launcher
}

main()
