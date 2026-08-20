import type { LogLevel } from 'electron-log'
import type { BrowserWindowConstructorOptions } from 'electron/main'
import type { DownloadCodecPref } from '../download'

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

type FavoriteCntInfo = {
  collect?: number
  play?: number
  danmaku?: number
  thumb_up?: number
  share?: number
}

type FavoriteUpper = {
  mid: number
  name: string
  face: string
}

// 收藏夹 / 合集目录项
type FavoriteFolder = {
  id: number
  fid?: number
  mid: number
  attr: number
  title: string
  media_count: number
  cover?: string
  intro?: string
  ctime?: number
  mtime?: number
  state?: number
  type?: number
  upper?: FavoriteUpper
  cnt_info?: FavoriteCntInfo
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
  /** 稿件分 P 总数，不是第几 P，也不是 cid */
  page?: number
  intro?: string
  ctime?: number
  pubtime?: number
  upper: FavoriteUpper
  cnt_info?: FavoriteCntInfo
}

// 当前登录用户信息（来自 /x/web-interface/nav，只保留 UI 用到的字段）
type UserInfo = {
  isLogin?: boolean
  mid: number
  uname: string
  face: string
  level_info?: {
    current_level: number
  }
  money?: number
  vipStatus?: number
  vip_label?: {
    text: string
  }
  vip_nickname_color?: string
  is_senior_member?: number
}

type DownloadTaskKey = {
  bvid: string
  cid: number
}

type BiliVideoPage = {
  cid: number
  page: number
  part: string
  duration: number
}

// 下载任务（一集/一分 P）
type DownloadVideoTask = {
  bvid: string
  cid: number
  page: number
  pages: number
  part: string
  title: string
  uname: string
  folderName: string
  coverUrl?: string
  /** 普通稿 ugc；番剧/影视 ogv */
  kind?: 'ugc' | 'ogv'
  /** ogv 单集 epid，取流时传给 pgc playurl */
  epId?: number
  /** 本次下载清晰度；缺省则用设置里的 qn */
  qn?: number
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
  cid: number
  title: string
}

type DownloadItemProgressArgs = {
  bvid: string
  cid: number
  type: DownloadProgressStatus
  progress: number
}

type DownloadItemEndArgs = {
  bvid: string
  cid: number
  title: string
  success: boolean
  message: string
  outputPath?: string
  cancelled?: boolean
}

// 下载历史（SQLite 持久化）
type DownloadHistoryStatus = 'downloading' | 'completed' | 'failed' | 'missing' | 'interrupted' | 'cancelled'

type DownloadHistoryRecord = {
  bvid: string
  cid: number
  page: number
  part: string
  title: string
  folderName: string
  cover: string
  outputPath: string | null
  fileSize: number
  status: DownloadHistoryStatus
  downloadedAt: number | null
  updatedAt: number
  /** 查询时对已完成记录做的文件存在性校验结果 */
  fileExists?: boolean
}

// 转换历史状态
type ConvertHistoryStatus = 'processing' | 'completed' | 'failed' | 'skipped' | 'interrupted' | 'missing' | 'scanned'

type ConvertPrescanResult = {
  pending: number
  inserted: number
  cacheOk: boolean
  message?: string
}

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
  coverUrl: string
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
  'convert:item:start': [ProcessItemStartArgs]
  'convert:item:progress': [ProcessItemProgressArgs]
  'convert:item:end': [ProcessItemEndArgs]
}

// 合成引擎事件映射
type ComposEventMap = EngineEventMap & {
  'convert:start': []
  'convert:ready': [ProcessReadyArgs]
  'convert:broke': [ProcessBrokeArgs]
  'convert:success': [ProcessFinishArgs]
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

// 合成任务配置
type ConfigOptions = {
  cachePath: string
  outputDir: string
  gpacBinPath: string
  /** 覆盖已存在的中间文件和成品 */
  replaceExisting: boolean
  /** 并行转换任务数（1/2/4/8） */
  concurrent: number
}

// 下载配置
type DownloadConfigOptions = {
  outputDir: string
  /** 并行下载任务数（1/2/4/8） */
  concurrent: number
  /** 目标清晰度 qn，实际取不超过该值的最高可用流 */
  qn: number
  /** 编码偏好，同清晰度下按此顺序挑选 */
  codec: DownloadCodecPref
}

// electron-store 配置类型
type UserStore = {
  'user-info'?: UserInfo | null
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
  /** 番剧等 PGC 接口用 result，不用 data */
  result?: D | null
  code: number
  message: string
}

type BangumiFollowItem = {
  seasonId: number
  mediaId: number
  title: string
  cover: string
  squareCover: string
  badge: string
  isFinish: number
  totalCount: number
  newEpIndexShow: string
  progress: string
  evaluate: string
  seasonType: number
}

type BangumiEpisode = {
  epId: number
  aid: number
  bvid: string
  cid: number
  title: string
  longTitle: string
  cover: string
  pubTime: number
  duration: number
  badge: string
}

type VideoViewDetail = {
  bvid: string
  title: string
  cover: string
  desc: string
  pubdate: number
  duration: number
  owner: FavoriteUpper
}

export type {
  BangumiEpisode,
  BangumiFollowItem,
  BiliResponseType,
  BiliVideoPage,
  ComposEventMap,
  CompositionOptions,
  ConfigOptions,
  ConvertHistoryRecord,
  ConvertHistoryStatus,
  ConvertPrescanResult,
  DownloadCodecPref,
  DownloadEventMap,
  DownloadHistoryRecord,
  DownloadHistoryStatus,
  DownloadItemEndArgs,
  DownloadItemProgressArgs,
  DownloadItemStartArgs,
  DownloadProgressStatus,
  DownloadTaskKey,
  DownloadConfigOptions,
  DownloadVideoTask,
  EngineBinMap,
  EngineEventMap,
  EngineResponse,
  FavoriteCntInfo,
  FavoriteFolder,
  FavoriteResource,
  FavoriteUpper,
  FileInfo,
  Page,
  Pages,
  ProcessItemProgressArgs,
  ProgressStatus,
  UserInfo,
  UserStore,
  VideoTaskInfo,
  VideoViewDetail
}
