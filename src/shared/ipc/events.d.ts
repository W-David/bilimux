import { OpenDialogOptions } from 'electron'
import type { ProgressInfo, UpdateCheckResult, UpdateInfo } from 'electron-updater'
import type { Cookie } from 'tough-cookie'
import type {
  BiliResponseType,
  ComposEventMap,
  ConvertHistoryRecord,
  ConvertPrescanResult,
  DownloadEventMap,
  DownloadHistoryRecord,
  DownloadTaskKey,
  DownloadVideoTask,
  UserStore
} from '../types'

type BiliHttpGetOptions = {
  searchParams?: Record<string, string | number | boolean | undefined>
  headers?: Record<string, string>
}

//主进程 handle IPC 事件
type IpcMainHandleEvents = {
  'get-preference': () => UserStore
  'get-app-version': () => string
  'open-file-dialog': (options: OpenDialogOptions) => string
  'open-path': (path: string) => string
  'open-folder': (path: string) => void
  'open-log-file': () => string
  'clear-log-file': () => boolean
  'start:process': () => void
  'convert:prescan': () => ConvertPrescanResult
  'check-for-update': () => UpdateCheckResult | null
  'download-update': () => string[]
  'quit-and-install': () => void
  'check-engine': () => boolean
  'get-cookie': () => Cookie | undefined
  logout: () => void
  'convert:history:list': () => ConvertHistoryRecord[]
  'convert:history:remove': (bvid: string) => void
  'convert:history:clear': () => void
  'download:video': (task: DownloadVideoTask) => void
  'download:pause': (key: DownloadTaskKey) => void
  'download:resume': (key: DownloadTaskKey) => void
  'download:cancel': (key: DownloadTaskKey) => void
  'download:history:list': (bvids: string[]) => DownloadHistoryRecord[]
  'download:history:get': (key: DownloadTaskKey) => DownloadHistoryRecord | null
  'download:history:clear': () => void
  'persist-cookie': () => void
  'http-get-video-metadata': (url: string) => [string[] | null, string | null]
  'http-get': (url: string, options?: BiliHttpGetOptions) => BiliResponseType
}

// 主进程 listen IPC 事件
type IpcMainListenEvents = {
  'save-preference': [UserStore]
  'reset-preference': []
}

// 渲染进程 listen IPC 事件
type IpcRendererEvents = ComposEventMap &
  DownloadEventMap & {
    'fetch-preference': []
    'update:checking': []
    'update:available': [UpdateInfo]
    'update:manual-download': [UpdateInfo]
    'update:not-available': []
    'update:error': [string]
    'update:progress': [ProgressInfo]
    'update:downloaded': []
    'convert:prescan:done': [ConvertPrescanResult]
  }

// 支持泛型函数的 RendererEmitterInvokeFn 类型
type RendererEmitterInvokeFn<T extends keyof IpcMainHandleEvents> = IpcMainHandleEvents[T] extends (
  ...args: infer A
) => infer R
  ? (...args: A) => Promise<R>
  : never

type RendererEmitterSendFn<T extends keyof IpcMainListenEvents> = (...args: IpcMainListenEvents[T]) => void

type RendererHandlerFn<T extends keyof IpcRendererEvents> = (
  listener: (...args: IpcRendererEvents[T]) => void
) => () => void

type IpcMainEvents = IpcMainHandleEvents | IpcMainListenEvents

export type {
  BiliHttpGetOptions,
  Cookie,
  IpcMainEvents,
  IpcMainHandleEvents,
  IpcMainListenEvents,
  IpcRendererEvents,
  RendererEmitterInvokeFn,
  RendererEmitterSendFn,
  RendererHandlerFn
}
