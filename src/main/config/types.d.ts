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

type ProgressData = {
  type: string
  progress?: number
  file: string
  raw: string
}

type ItemData = {
  idx: number
  len: number
}

// 引擎事件映射
type EngineEventMap = {
  progress: [ProgressData]
  itemProgress: [ItemData]
}

//文件结构信息
type FileInfo = {
  dirPath: string
  fileName: string
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
  CompositionOptions,
  ConfigOptions,
  EngineBinMap,
  EngineEventMap,
  EngineResponse,
  FileInfo,
  ItemData,
  Page,
  Pages,
  ProgressData,
  UserStore,
  VideoTaskInfo
}
