import { IpcMainEvents, IpcRendererEvents } from '@preload/ipcEvent'
import { IpcEmitter, IpcListener } from './ipc'
import mitt from './mitt'
import { MittEventMap } from './types'

export const ipc = new IpcListener<IpcRendererEvents>()
export const emitter = new IpcEmitter<IpcMainEvents>()
export const mittbus = mitt<MittEventMap>()
