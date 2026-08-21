import { app } from 'electron/main'
import process from 'node:process'

export default class Context {
  platform: NodeJS.Platform
  appVersion: string

  constructor() {
    this.platform = process.platform
    this.appVersion = app.getVersion()
  }
}
