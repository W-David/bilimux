import { OpenDialogOptions } from 'electron'
import type { ItemData, ProgressData, UserStore } from '../main/config/types'

//主进程 handle IPC 事件
type IpcMainHandleEvents = {
  'get-preference': () => UserStore
  'get-app-version': () => string
  'open-file-dialog': (options: OpenDialogOptions) => string
  'open-path': (path: string) => string
  'open-folder': (path: string) => void
  'open-log-file': () => string
  'start:process': () => void
  'check-for-update': () => import('electron-updater').UpdateCheckResult | null
  'download-update': () => string[]
  'quit-and-install': () => void
}

// 主进程 listen IPC 事件
type IpcMainListenEvents = {
  'save-preference': [UserStore]
  'reset-preference': []
}

// 渲染进程 listen IPC 事件
type IpcRendererEvents = {
  'process:progress': [ProgressData]
  'item:progress': [ItemData]
  'toast:message': [
    { type: 'success' | 'info' | 'warn' | 'error' | 'secondary' | 'contrast'; message: string }
  ]
  'fetch-preference': []
}

type RendererEmitterInvokeFn<T extends keyof IpcMainHandleEvents> = (
  ...args: Parameters<IpcMainHandleEvents[T]>
) => Promise<ReturnType<IpcMainHandleEvents[T]>>

type RendererEmitterSendFn<T extends keyof IpcMainListenEvents> = (
  ...args: IpcMainListenEvents[T]
) => void

type RendererHandlerFn<T extends keyof IpcRendererEvents> = (
  listener: (...args: IpcRendererEvents[T]) => void
) => () => void

type IpcMainEvents = IpcMainHandleEvents | IpcMainListenEvents

export type {
  RendererInvokeFn as InvokeFunction,
  IpcMainEvents,
  IpcMainHandleEvents,
  IpcMainListenEvents,
  IpcRendererEvents,
  RendererEmitterInvokeFn,
  RendererEmitterSendFn,
  RendererHandlerFn
}
