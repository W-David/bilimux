import { contextBridge, ipcRenderer, webFrame } from 'electron'

export interface NodeProcess {
  readonly platform: NodeJS.Platform
  readonly versions: NodeJS.ProcessVersions
  readonly arch: NodeJS.Architecture
  readonly env: NodeJS.ProcessEnv
}

export type IpcRendererAPI = Pick<
  Electron.IpcRenderer,
  'send' | 'sendSync' | 'sendToHost' | 'postMessage' | 'invoke'
> & {
  on(...args: Parameters<Electron.IpcRenderer['on']>): () => void
  once(...args: Parameters<Electron.IpcRenderer['once']>): () => void
  removeAllListeners(...args: Parameters<Electron.IpcRenderer['removeAllListeners']>): void
}

export interface ElectronAPI {
  ipcRenderer: IpcRendererAPI
  webFrame: Pick<Electron.WebFrame, 'clearCache' | 'insertCSS' | 'setZoomFactor' | 'setZoomLevel'>
  process: NodeProcess
}

export const electronAPI: ElectronAPI = {
  ipcRenderer: {
    send(channel, ...args) {
      ipcRenderer.send(channel, ...args)
    },
    sendSync(channel, ...args) {
      return ipcRenderer.sendSync(channel, ...args)
    },
    sendToHost(channel, ...args) {
      ipcRenderer.sendToHost(channel, ...args)
    },
    postMessage(channel, message, transfer) {
      ipcRenderer.postMessage(channel, message, transfer)
    },
    invoke(channel, ...args) {
      return ipcRenderer.invoke(channel, ...args)
    },
    on(channel, listener) {
      ipcRenderer.on(channel, listener)
      return () => {
        ipcRenderer.removeListener(channel, listener)
      }
    },
    once(channel, listener) {
      ipcRenderer.once(channel, listener)
      return () => {
        ipcRenderer.removeListener(channel, listener)
      }
    },
    removeAllListeners(channel) {
      ipcRenderer.removeAllListeners(channel)
    }
  },
  webFrame: {
    insertCSS(css) {
      return webFrame.insertCSS(css)
    },
    setZoomFactor(factor) {
      if (typeof factor === 'number' && factor > 0) {
        webFrame.setZoomFactor(factor)
      }
    },
    setZoomLevel(level) {
      if (typeof level === 'number') {
        webFrame.setZoomLevel(level)
      }
    },
    clearCache() {
      webFrame.clearCache()
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
    },
    get env() {
      return { ...process.env }
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
