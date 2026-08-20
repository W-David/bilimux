import { app } from 'electron'
import path from 'node:path'
import Application from './Application'
import Launcher from './Launcher'

function main(): void {
  if (!app.isPackaged) {
    app.setPath('userData', path.join(app.getPath('appData'), 'bilimux-dev'))
  }

  const application = new Application()
  new Launcher(application)
}

main()
