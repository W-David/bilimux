import { isInvokeChannel, isReceiveChannel, isSendChannel } from '@shared/ipc/channels'
import { contextBridge, ipcRenderer } from 'electron'

export interface NodeProcess {
  readonly platform: NodeJS.Platform
  readonly versions: NodeJS.ProcessVersions
  readonly arch: NodeJS.Architecture
}

export type IpcRendererAPI = {
  send(channel: string, ...args: unknown[]): void
  invoke(channel: string, ...args: unknown[]): Promise<unknown>
  on(channel: string, listener: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void): () => void
  once(channel: string, listener: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void): () => void
}

export interface ElectronAPI {
  ipcRenderer: IpcRendererAPI
  process: NodeProcess
}

function assertInvokeChannel(channel: string): void {
  if (!isInvokeChannel(channel)) {
    throw new Error(`Blocked IPC invoke: ${channel}`)
  }
}

function assertSendChannel(channel: string): void {
  if (!isSendChannel(channel)) {
    throw new Error(`Blocked IPC send: ${channel}`)
  }
}

function assertReceiveChannel(channel: string): void {
  if (!isReceiveChannel(channel)) {
    throw new Error(`Blocked IPC listen: ${channel}`)
  }
}

export const electronAPI: ElectronAPI = {
  ipcRenderer: {
    send(channel, ...args) {
      assertSendChannel(channel)
      ipcRenderer.send(channel, ...args)
    },
    invoke(channel, ...args) {
      assertInvokeChannel(channel)
      return ipcRenderer.invoke(channel, ...args)
    },
    on(channel, listener) {
      assertReceiveChannel(channel)
      ipcRenderer.on(channel, listener)
      return () => {
        ipcRenderer.removeListener(channel, listener)
      }
    },
    once(channel, listener) {
      assertReceiveChannel(channel)
      ipcRenderer.once(channel, listener)
      return () => {
        ipcRenderer.removeListener(channel, listener)
      }
    }
  },
  process: {
    get platform() {
      return process.platform
    },
    get arch() {
      return process.arch
    },
    get versions() {
      return process.versions
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore window object doesn't have electron property in strict mode
  window.electron = electronAPI
}
