import { app } from 'electron/main'
import process from 'node:process'
import logger from './Logger'

type ProcessContext = {
  platform: NodeJS.Platform
  arch: NodeJS.Architecture
  nodeVersion: string
  appVersion: string
}

export default class Context implements ProcessContext {
  platform: NodeJS.Platform
  arch: NodeJS.Architecture
  nodeVersion: string
  appVersion: string

  constructor() {
    const { platform, arch, version } = process
    this.platform = platform
    this.arch = arch
    this.nodeVersion = version
    this.appVersion = app.getVersion()

    logger.info(this.constructor.name, 'inited')
  }
}
