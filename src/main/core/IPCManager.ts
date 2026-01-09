import { IpcMainEvents, IpcRendererEvents } from '@shared/ipc/events'
import type { ExtractArgs, ExtractHandler, IpcEventMap, IpcListenEventMap } from '@shared/ipc/types'
import { ipcMain } from 'electron'
import logger from './Logger'

/**
 * Typed listener for Electron `ipcMain`.
 */
class IpcListener<T extends IpcEventMap> {
  private listeners: string[] = []
  private handlers: string[] = []

  /**
   * Listen to `channel`.
   */
  on<E extends keyof ExtractArgs<T>>(
    channel: Extract<E, string>,
    listener: (e: Electron.IpcMainEvent, ...args: ExtractArgs<T>[E]) => void | Promise<void>
  ): void {
    this.listeners.push(channel)
    ipcMain.on(channel, listener as (e: Electron.IpcMainEvent, ...args: unknown[]) => void)
  }

  /**
   * Handle a renderer invoke request.
   */
  handle<E extends keyof ExtractHandler<T>>(
    channel: Extract<E, string>,
    listener: (
      e: Electron.IpcMainInvokeEvent,
      ...args: Parameters<ExtractHandler<T>[E]>
    ) => ReturnType<ExtractHandler<T>[E]> | Promise<ReturnType<ExtractHandler<T>[E]>>
  ): void {
    this.handlers.push(channel)
    ipcMain.handle(channel, listener as (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => unknown)
  }

  /**
   * Dispose all listeners and handlers.
   */
  dispose(): void {
    this.listeners.forEach(c => ipcMain.removeAllListeners(c))
    this.listeners = []
    this.handlers.forEach(c => ipcMain.removeHandler(c))
    this.handlers = []
  }
}

/**
 * Typed emitter for sending an asynchronous message to the renderer process.
 */
class IpcEmitter<T extends IpcListenEventMap> {
  /**
   * Send an asynchronous message to the renderer process.
   */
  send<E extends keyof T>(sender: Electron.WebContents, channel: Extract<E, string>, ...args: T[E]): void {
    sender.send(channel, ...args)
  }
}

export default class IPCManager {
  mainIpc: IpcListener<IpcMainEvents>
  mainEmitter: IpcEmitter<IpcRendererEvents>
  constructor() {
    this.mainIpc = new IpcListener<IpcMainEvents>()
    this.mainEmitter = new IpcEmitter<IpcRendererEvents>()

    logger.info(this.constructor.name, 'inited')
  }

  dispose() {
    this.mainIpc.dispose()
  }
}
