import type { LogLevel } from 'electron-log'
import type { BrowserWindowConstructorOptions } from 'electron/main'

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

type ProcessItemStartArgs = {
  bv: VideoTaskInfo
  /** 合成产物路径（由引擎计算） */
  outputPath?: string
}

type ProgressStatus = 'waiting' | 'preprocess' | 'importing' | 'writing' | 'success' | 'fail'
type DownloadTaskStatus = 'waiting' | 'downloading' | 'paused' | 'success' | 'fail'

// 收藏夹
type FavoriteFolder = {
  id: number
  fid: number
  mid: number
  attr: number
  title: string
  media_count: number
  cover?: string
  intro?: string
  ctime?: number
}

// 收藏夹内的视频资源
type FavoriteResource = {
  id: number
  type: number
  title: string
  cover: string
  duration: number
  attr: number
  bvid: string
  upper: {
    mid: number
    name: string
    face: string
  }
}

// 收藏夹及其内的全部视频
type FavoriteFolderData = FavoriteFolder & {
  videos: FavoriteResource[]
}

// 一次性获取到的全部收藏数据
type FavoritesData = {
  folders: FavoriteFolderData[]
}

// 当前登录用户信息（来自 /x/web-interface/nav）
type UserInfo = {
  isLogin: boolean
  mid: number
  uname: string
  face: string
  face_nft?: number
  face_nft_type?: number
  email_verified?: number
  mobile_verified?: number
  level_info: {
    current_level: number
    current_min: number
    current_exp: number
    next_exp: number | string
  }
  money?: number
  moral?: number
  official: {
    role: number
    title: string
    desc: string
    type: number
  }
  officialVerify?: {
    type: number
    desc: string
  }
  pendant?: {
    pid: number
    name: string
    image: string
    expire: number
    image_enhance?: string
    image_enhance_frame?: string
  } | null
  scores?: number
  vipDueDate: number
  vipStatus: number
  vipType: number
  vip_pay_type?: number
  vip_theme_type?: number
  vip_label: {
    path: string
    text: string
    label_theme: string
    text_color: string
    bg_color: string
    border_color?: string
    use_img_label?: boolean
    img_label_uri_hans?: string
    img_label_uri_hant?: string
    img_label_uri_hans_static?: string
    img_label_uri_hant_static?: string
  }
  vip_avatar_subscript?: number
  vip_nickname_color: string
  wallet?: {
    mid: number
    bcoin_balance: number
    coupon_balance: number
    coupon_due_time: number
  }
  has_shop?: boolean
  shop_url?: string
  allowance_count?: number
  answer_status?: number
  is_senior_member?: number
  wbi_img?: {
    img_url?: string
    sub_url?: string
  }
  is_jury?: boolean
}

// 下载任务
type DownloadVideoTask = {
  bvid: string
  title: string
  uname: string
  folderName: string
  coverUrl?: string
}

type DownloadProgressStatus =
  | 'waiting'
  | 'downloading'
  | 'paused'
  | 'preprocess'
  | 'importing'
  | 'writing'
  | 'success'
  | 'fail'

type DownloadItemStartArgs = {
  bvid: string
  title: string
}

type DownloadItemProgressArgs = {
  bvid: string
  type: DownloadProgressStatus
  progress: number
}

type DownloadItemEndArgs = {
  bvid: string
  title: string
  success: boolean
  message: string
  outputPath?: string
}

// 下载历史（SQLite 持久化）
type DownloadHistoryStatus = 'downloading' | 'completed' | 'failed' | 'missing'

type DownloadHistoryRecord = {
  bvid: string
  title: string
  folderName: string
  outputPath: string | null
  fileSize: number
  status: DownloadHistoryStatus
  downloadedAt: number | null
  updatedAt: number
  /** 查询时对已完成记录做的文件存在性校验结果 */
  fileExists?: boolean
}

// 转换历史状态
type ConvertHistoryStatus = 'processing' | 'completed' | 'failed' | 'skipped' | 'interrupted' | 'missing'

// 转换历史记录
type ConvertHistoryRecord = {
  id: number
  runId: string
  /** 同一运行内的扫描序号，用于保持列表顺序稳定 */
  runSeq: number
  bvid: string
  type: string
  title: string
  uname: string
  groupTitle: string
  sourceDir: string
  outputPath: string | null
  fileSize: number
  status: ConvertHistoryStatus
  errorMessage: string
  durationMs: number | null
  startedAt: number | null
  completedAt: number | null
  updatedAt: number
  /** 查询时对产物文件做的存在性校验结果 */
  fileExists?: boolean
}

// 下载事件映射
type DownloadEventMap = {
  'download:item:start': [DownloadItemStartArgs]
  'download:item:progress': [DownloadItemProgressArgs]
  'download:item:end': [DownloadItemEndArgs]
}

type ProcessItemProgressArgs = {
  bvid: string
  type: ProgressStatus
  progress: number
}

type ProcessItemEndArgs = {
  bvid: string
  success: boolean
  message: string
  /** 合成产物路径（由引擎计算） */
  outputPath?: string
  /** 单个任务耗时（毫秒） */
  durationMs?: number
  /** 产物已存在且未强制覆盖时跳过合成 */
  skipped?: boolean
  /** 合成产物文件大小（字节） */
  fileSize?: number
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
  'process:item:start': [ProcessItemStartArgs]
  'process:item:progress': [ProcessItemProgressArgs]
  'process:item:end': [ProcessItemEndArgs]
}

// 合成引擎事件映射
type ComposEventMap = EngineEventMap & {
  'process:start': []
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

// 下载配置
type DownloadConfigOptions = {
  outputDir: string
  /** 并行下载任务数（1-16） */
  concurrent: number
}

// electron-store 配置类型
type UserStore = {
  'user-info'?: UserInfo | null
  'favorites-data'?: FavoritesData | null
  'convert-config': ConfigOptions
  'download-config': DownloadConfigOptions
  'open-at-login': boolean
  'auto-hide-window': boolean
  'bind-close-to-hide': boolean
  'log-level': LogLevel
}

type BiliResponseType<D = unknown> = {
  ttl: number
  data: D | null
  code: number
  message: string
}

type VideoType = 'BV' | 'BVS' | 'FESTIVAL' | 'BANGUMI' | 'CHEESE'

type RegType = {
  reg: RegExp
  type: VideoType
}

export type {
  BiliResponseType,
  ComposEventMap,
  CompositionOptions,
  ConfigOptions,
  ConvertHistoryRecord,
  ConvertHistoryStatus,
  DownloadEventMap,
  DownloadHistoryRecord,
  DownloadHistoryStatus,
  DownloadItemEndArgs,
  DownloadItemProgressArgs,
  DownloadItemStartArgs,
  DownloadProgressStatus,
  DownloadTaskStatus,
  DownloadConfigOptions,
  DownloadVideoTask,
  EngineBinMap,
  EngineEventMap,
  EngineResponse,
  FavoriteFolder,
  FavoriteFolderData,
  FavoriteResource,
  FavoritesData,
  FileInfo,
  Page,
  Pages,
  ProcessItemProgressArgs,
  ProgressStatus,
  RegType,
  UserInfo,
  UserStore,
  VideoTaskInfo,
  VideoType
}
