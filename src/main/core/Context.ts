import { app } from 'electron/main'
import os from 'node:os'
import process from 'node:process'

type ProcessContext = {
  platform: NodeJS.Platform
  arch: NodeJS.Architecture
  nodeVersion: string
  appVersion: string
  cpus: os.CpuInfo[]
}

export default class Context implements ProcessContext {
  platform: NodeJS.Platform
  arch: NodeJS.Architecture
  nodeVersion: string
  appVersion: string
  cpus: os.CpuInfo[]

  constructor() {
    const { platform, arch, version } = process
    this.platform = platform
    this.arch = arch
    this.nodeVersion = version
    this.appVersion = app.getVersion()
    this.cpus = os.cpus()
  }
}
