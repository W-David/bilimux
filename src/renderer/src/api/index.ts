import { emitter, ipc } from '@renderer/ipc'
import { RendererEmitterInvokeFn, RendererEmitterSendFn, RendererHandlerFn } from '@shared/ipc/events'

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
 * 检查引擎是否可用
 */
export const checkEngine: RendererEmitterInvokeFn<'check-engine'> = () => {
  return emitter.invoke('check-engine')
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
export const openPath: RendererEmitterInvokeFn<'open-path'> = path => {
  return emitter.invoke('open-path', path)
}

/**
 * 打开指定文件夹
 */
export const openFolder: RendererEmitterInvokeFn<'open-folder'> = path => {
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
export const saveConfigToNativeStore: RendererEmitterSendFn<'save-preference'> = setting => {
  emitter.send('save-preference', setting)
}

/**
 * 使用默认配置重置本地存储
 */
export const clearNativeStore: RendererEmitterSendFn<'reset-preference'> = () => {
  emitter.send('reset-preference')
}

/**
 * 订阅处理开始事件
 */
export const subscribeProcessStartEvent: RendererHandlerFn<'process:start'> = listener => {
  return ipc.on('process:start', () => listener())
}

/**
 * 订阅处理准备事件
 */
export const subscribeProcessReadyEvent: RendererHandlerFn<'process:ready'> = listener => {
  return ipc.on('process:ready', (_, args) => listener(args))
}

/**
 * 订阅处理中断事件
 */
export const subscribeProcessBrokeEvent: RendererHandlerFn<'process:broke'> = listener => {
  return ipc.on('process:broke', (_, args) => listener(args))
}

/**
 * 订阅处理成功事件
 */
export const subscribeProcessSuccessEvent: RendererHandlerFn<'process:success'> = listener => {
  return ipc.on('process:success', (_, args) => listener(args))
}

/**
 * 订阅处理进度事件
 */
export const subscribeProcessItemProgressEvent: RendererHandlerFn<'process:item:progress'> = listener => {
  return ipc.on('process:item:progress', (_, args) => listener(args))
}

/**
 * 订阅处理开始事件
 */
export const subscribeProcessItemStartEvent: RendererHandlerFn<'process:item:start'> = listener => {
  return ipc.on('process:item:start', (_, args) => listener(args))
}

/**
 * 订阅处理结束事件
 */
export const subscribeProcessItemEndEvent: RendererHandlerFn<'process:item:end'> = listener => {
  return ipc.on('process:item:end', (_, args) => listener(args))
}

/**
 * 订阅获取偏好设置事件
 */
export const subscribeFetchPreferenceEvent: RendererHandlerFn<'fetch-preference'> = listener => {
  return ipc.on('fetch-preference', () => listener())
}

/**
 * 订阅更新可用事件
 */
export const subscribeUpdateAvailable: RendererHandlerFn<'update:available'> = listener => {
  return ipc.on('update:available', (_, args) => listener(args))
}

/**
 * 订阅没有更新事件
 */
export const subscribeUpdateNotAvailable: RendererHandlerFn<'update:not-available'> = listener => {
  return ipc.on('update:not-available', () => listener())
}

/**
 * 订阅更新错误事件
 */
export const subscribeUpdateError: RendererHandlerFn<'update:error'> = listener => {
  return ipc.on('update:error', (_, args) => listener(args))
}

/**
 * 订阅更新进度事件
 */
export const subscribeUpdateProgress: RendererHandlerFn<'update:progress'> = listener => {
  return ipc.on('update:progress', (_, args) => listener(args))
}

/**
 * 订阅更新下载完成事件
 */
export const subscribeUpdateDownloaded: RendererHandlerFn<'update:downloaded'> = listener => {
  return ipc.on('update:downloaded', () => listener())
}
