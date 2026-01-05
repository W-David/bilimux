import type { LogLevel } from 'electron-log'
import { BrowserWindowConstructorOptions } from 'electron/main'

type Page = {
  attrs: BrowserWindowConstructorOptions
  openDevTools: boolean
  url: string
}

type Pages = {
  [k: string]: Page
}

// Engine文件
type EngineBinMap = {
  darwin: string
  win32: string
  linux: string
}

// EngineResponse
type EngineResponse = {
  success: boolean
  code: number
}

// 合成选项
type CompositionOptions = {
  bvInfo: VideoTaskInfo
  videoFile: string
  audioFile: string
  outputFile: string
}

type ProcessStartArgs = {
  bv: VideoTaskInfo
}

type ProgressStatus = 'waiting' | 'preprocess' | 'importing' | 'writing' | 'success' | 'fail'

type ProcessProgressArgs = {
  bvid: string
  type: ProgressStatus
  progress: number
}

type ProcessEndArgs = {
  bvid: string
  success: boolean
  message: string
}

type ProcessBrokeArgs = {
  reason: string
}

type ProcessReadyArgs = {
  bvs: VideoTaskInfo[]
}

type ProcessFinishArgs = {
  count: {
    success: number
    fail: number
  }
}

// 引擎事件映射
type EngineEventMap = {
  'process:item:start': [ProcessStartArgs]
  'process:item:progress': [ProcessProgressArgs]
  'process:item:end': [ProcessEndArgs]
}

// 合成引擎事件映射
type ComposEventMap = EngineEventMap & {
  'process:ready': [ProcessReadyArgs]
  'process:broke': [ProcessBrokeArgs]
  'process:success': [ProcessFinishArgs]
}

//文件结构信息
type FileInfo = {
  dirPath: string
  fileName: string
  filePath: string
  videoM4sPath: string
  audioM4sPath: string
  videoMp4Path: string
  audioMp3Path: string
}

// 视频信息
type VideoTaskInfo = {
  type: 'ugc' | 'ogv' | ''
  bvid: string
  uname: string
  coverUrl: string
  coverPath: string
  title: string
  groupTitle: string
  status: string
  fileInfo: FileInfo
}

type VideoTaskMessage = Pick<VideoTaskInfo, 'bvid' | 'type' | 'title'> & {
  fileName: Pick<FileInfo, 'fileName'>
}

// 合成任务配置
type ConfigOptions = {
  cachePath: string
  outputDir: string
  gpacBinPath: string
  forceTransform: boolean
  forceComposition: boolean
  genConfig: boolean
}

// electron-store 配置类型
type UserStore = {
  'convert-config': ConfigOptions
  'open-at-login': boolean
  'auto-hide-window': boolean
  'bind-close-to-hide': boolean
  'log-level': LogLevel
}

export type {
  ComposEventMap,
  CompositionOptions,
  ConfigOptions,
  EngineBinMap,
  EngineEventMap,
  EngineResponse,
  FileInfo,
  Page,
  Pages,
  ProcessProgressArgs as ProgressData,
  ProgressStatus,
  UserStore,
  VideoTaskInfo
}
