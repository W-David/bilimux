export type IpcListenEventMap = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any[]
}

export type IpcHandleEventMap = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: (...args: any[]) => any
}

export type IpcEventMap = IpcListenEventMap | IpcHandleEventMap

export type ExtractArgs<T> = T extends IpcListenEventMap ? T : never

export type ExtractHandler<T> = T extends IpcHandleEventMap ? T : never
