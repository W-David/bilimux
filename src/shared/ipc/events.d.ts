import { OpenDialogOptions } from 'electron'
import type { ProgressInfo, UpdateCheckResult, UpdateInfo } from 'electron-updater'
import type { ComposEventMap, UserStore } from '../../main/config/types'

//主进程 handle IPC 事件
type IpcMainHandleEvents = {
  'get-preference': () => UserStore
  'get-app-version': () => string
  'open-file-dialog': (options: OpenDialogOptions) => string
  'open-path': (path: string) => string
  'open-folder': (path: string) => void
  'open-log-file': () => string
  'start:process': () => void
  'check-for-update': () => UpdateCheckResult | null
  'download-update': () => string[]
  'quit-and-install': () => void
  'check-engine': () => boolean
}

// 主进程 listen IPC 事件
type IpcMainListenEvents = {
  'save-preference': [UserStore]
  'reset-preference': []
}

// 渲染进程 listen IPC 事件
type IpcRendererEvents = ComposEventMap & {
  'fetch-preference': []
  'update:checking': []
  'update:available': [UpdateInfo]
  'update:not-available': []
  'update:error': [string]
  'update:progress': [ProgressInfo]
  'update:downloaded': []
}

type RendererEmitterInvokeFn<T extends keyof IpcMainHandleEvents> = (
  ...args: Parameters<IpcMainHandleEvents[T]>
) => Promise<ReturnType<IpcMainHandleEvents[T]>>

type RendererEmitterSendFn<T extends keyof IpcMainListenEvents> = (...args: IpcMainListenEvents[T]) => void

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
