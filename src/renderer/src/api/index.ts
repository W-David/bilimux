import {
  RendererEmitterInvokeFn,
  RendererEmitterSendFn,
  RendererHandlerFn
} from '@preload/ipcEvent'
import { emitter, ipc } from '@renderer/ipc'

/**
 * 从本地存储加载配置
 */
export const loadConfigFromNativeStore: RendererEmitterInvokeFn<'get-preference'> = () => {
  return emitter.invoke('get-preference')
}

/**
 * 获取应用版本号
 */
export const getAppVersion: RendererEmitterInvokeFn<'get-app-version'> = () => {
  return emitter.invoke('get-app-version')
}

/**
 * 检查更新
 */
export const checkForUpdate: RendererEmitterInvokeFn<'check-for-update'> = () => {
  return emitter.invoke('check-for-update')
}

/**
 * 下载更新
 */
export const downloadUpdate: RendererEmitterInvokeFn<'download-update'> = () => {
  return emitter.invoke('download-update')
}

/**
 * 退出并安装
 */
export const quitAndInstall: RendererEmitterInvokeFn<'quit-and-install'> = () => {
  return emitter.invoke('quit-and-install')
}

/**
 * 打开文件选择对话框
 */
export const openFileDialog: RendererEmitterInvokeFn<'open-file-dialog'> = (...options) => {
  const filePath = emitter.invoke('open-file-dialog', ...options)
  return filePath
}

/**
 * 开始处理流程
 */
export const startProcess: RendererEmitterInvokeFn<'start:process'> = () => {
  return emitter.invoke('start:process')
}

/**
 * 打开指定路径
 */
export const openPath: RendererEmitterInvokeFn<'open-path'> = (path) => {
  return emitter.invoke('open-path', path)
}

/**
 * 打开指定文件夹
 */
export const openFolder: RendererEmitterInvokeFn<'open-folder'> = (path) => {
  return emitter.invoke('open-folder', path)
}

/**
 * 打开日志文件
 */
export const openLogFile: RendererEmitterInvokeFn<'open-log-file'> = () => {
  return emitter.invoke('open-log-file')
}

/**
 * 保存配置到本地存储
 */
export const saveConfigToNativeStore: RendererEmitterSendFn<'save-preference'> = (setting) => {
  emitter.send('save-preference', setting)
}

/**
 * 使用默认配置重置本地存储
 */
export const clearNativeStore: RendererEmitterSendFn<'reset-preference'> = () => {
  emitter.send('reset-preference')
}

/**
 * 订阅处理进度事件
 */
export const subscribeProcessProgressEvent: RendererHandlerFn<'process:progress'> = (listener) => {
  return ipc.on('process:progress', (_, args) => listener(args))
}

/**
 * 订阅处理进度事件
 */
export const subscribeItemProgressEvent: RendererHandlerFn<'item:progress'> = (listener) => {
  return ipc.on('item:progress', (_, args) => listener(args))
}

/**
 * 订阅获取偏好设置事件
 */
export const subscribeFetchPreferenceEvent: RendererHandlerFn<'fetch-preference'> = (listener) => {
  return ipc.on('fetch-preference', () => listener())
}

/**
 * 处理主进程发送的toast消息事件
 */
export const subscribeToastMessageEvent: RendererHandlerFn<'toast:message'> = (callback) => {
  return ipc.on('toast:message', (_, arg) => callback(arg))
}
