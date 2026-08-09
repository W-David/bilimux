import { DownloadEventMap, DownloadProgressStatus, DownloadVideoTask } from '@shared/types'
import { EventEmitter } from 'node:events'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createDirIfNotExist, sanitizeFileName } from '../utils'
import { getWbiSignedParams } from '../utils/wbi'
import { ComposEngine } from './ComposEngine'
import ConfigManager from './ConfigManager'
import DownloadHistoryStore from './DownloadHistoryStore'
import HttpClient from './HttpClient'
import logger from './Logger'
import ProcessQueue from './ProcessQueue'

type DashStream = {
  baseUrl?: string
  backupUrl?: string[]
}

type DashData = {
  video?: DashStream[]
  audio?: DashStream[]
}

type DurlStream = {
  url: string
  backup_url?: string[]
}

type PlayUrlData = {
  dash?: DashData
  durl?: DurlStream[]
}

type StreamKind = 'video' | 'audio' | 'durl'
type DownloadMode = 'dash' | 'durl'

type StreamRuntime = {
  kind: StreamKind
  url: string | undefined
  backupUrls: string[]
  destPath: string
  received: number
  total: number
  completed: boolean
}

type TaskRuntime = {
  task: DownloadVideoTask
  status: DownloadProgressStatus
  stage: StreamKind | 'merge'
  mode?: DownloadMode
  cid?: number
  playUrlFetched: boolean
  folderDir: string
  finalPath: string
  tempDir: string | null
  streams: Partial<Record<StreamKind, StreamRuntime>>
  abort?: AbortController
}

class DownloadPausedError extends Error {}

export default class DownloadManager extends EventEmitter<DownloadEventMap> {
  private httpClient: HttpClient
  private configManager: ConfigManager
  private composEngine: ComposEngine
  private historyStore: DownloadHistoryStore
  private queue: ProcessQueue<void>
  private tasks: Map<string, TaskRuntime>

  constructor(
    httpClient: HttpClient,
    configManager: ConfigManager,
    composEngine: ComposEngine,
    historyStore: DownloadHistoryStore
  ) {
    super()
    this.httpClient = httpClient
    this.configManager = configManager
    this.composEngine = composEngine
    this.historyStore = historyStore
    this.queue = new ProcessQueue<void>({ concurrency: 1 })
    this.tasks = new Map()
    this.applyConcurrency()
  }

  /**
   * 从配置读取并行下载任务数并应用到队列
   */
  private applyConcurrency(): void {
    const config = this.configManager.getStore()['download-config']
    this.setConcurrency(config.concurrent)
  }

  /**
   * 设置并行下载任务数（限制 1-16）
   */
  public setConcurrency(count: number): void {
    const safe = Math.min(16, Math.max(1, Math.trunc(Number(count)) || 1))
    this.queue.setConcurrency(safe)
  }

  /**
   * 开始下载任务；任务已存在时视为恢复/重试
   */
  public start(task: DownloadVideoTask): void {
    const runtime = this.tasks.get(task.bvid)
    if (runtime) {
      if (runtime.status === 'waiting' || runtime.status === 'downloading') {
        return
      }
      if (runtime.status === 'success') {
        // 用户主动再次下载：丢弃旧运行时，从头重新下载
        logger.info(`重新下载已完成的视频: ${task.bvid}`)
        this.tasks.delete(task.bvid)
        const newRuntime = this.createRuntime(task)
        this.tasks.set(task.bvid, newRuntime)
        this.enqueue(newRuntime)
        return
      }
      this.enqueue(runtime)
      return
    }

    const newRuntime = this.createRuntime(task)
    this.tasks.set(task.bvid, newRuntime)
    this.enqueue(newRuntime)
  }

  /**
   * 暂停下载任务；合并阶段不可暂停
   */
  public pause(bvid: string): void {
    const runtime = this.tasks.get(bvid)
    if (!runtime) return
    if (runtime.status === 'paused' || runtime.status === 'success' || runtime.status === 'fail') return
    if (runtime.stage === 'merge') return

    runtime.status = 'paused'
    runtime.abort?.abort()
    this.emit('download:item:progress', {
      bvid,
      type: 'paused',
      progress: this.currentProgress(runtime)
    })
    logger.debug(`下载任务已暂停: ${bvid}`)
  }

  /**
   * 恢复已暂停的下载任务
   */
  public resume(bvid: string): void {
    const runtime = this.tasks.get(bvid)
    if (!runtime || runtime.status !== 'paused') return
    this.enqueue(runtime)
  }

  private createRuntime(task: DownloadVideoTask): TaskRuntime {
    const outputDir = this.configManager.getStore()['download-config'].outputDir
    // 直接按文件名生成在 output/download 目录下
    const finalPath = path.join(outputDir, `[${task.bvid}]-[${task.uname}]-${sanitizeFileName(task.title)}.mp4`)
    const folderDir = path.dirname(finalPath)

    return {
      task,
      status: 'waiting',
      stage: 'video',
      playUrlFetched: false,
      folderDir,
      finalPath,
      tempDir: null,
      streams: {}
    }
  }

  private enqueue(runtime: TaskRuntime): void {
    runtime.status = 'waiting'
    this.queue
      .add(() => this.handleTask(runtime))
      .catch(error => {
        if (error instanceof DownloadPausedError || this.isPaused(runtime)) return
        logger.error(`下载任务队列执行失败: ${runtime.task.title}`, error)
      })
  }

  /**
   * 处理单个下载任务
   */
  private async handleTask(runtime: TaskRuntime): Promise<void> {
    const { bvid, title } = runtime.task
    if (runtime.status === 'paused') return

    runtime.abort = new AbortController()
    this.emit('download:item:start', { bvid, title })
    this.emit('download:item:progress', {
      bvid,
      type: 'downloading',
      progress: this.currentProgress(runtime)
    })
    this.historyStore.markStarted(bvid, title, runtime.task.folderName)

    try {
      // 已获取过播放地址（恢复/重试）时强制刷新，避免 URL 过期
      await this.fetchPlayUrls(runtime, runtime.playUrlFetched)

      if (runtime.mode === 'dash' && runtime.tempDir) {
        await createDirIfNotExist(runtime.tempDir)
        await this.downloadStream(runtime, 'video')
        await this.downloadStream(runtime, 'audio')

        runtime.stage = 'merge'
        const videoPath = runtime.streams.video?.destPath
        const audioPath = runtime.streams.audio?.destPath
        if (!videoPath || !audioPath) {
          throw new Error('音视频临时文件路径缺失')
        }

        await this.composEngine.mergeFiles({
          bvid,
          title,
          videoPath,
          audioPath,
          outputPath: runtime.finalPath,
          tempDir: runtime.tempDir,
          onProgress: (type, progress) => {
            this.emit('download:item:progress', { bvid, type, progress })
          }
        })
        await fs.rm(runtime.tempDir, { recursive: true, force: true })
      } else if (runtime.mode === 'durl') {
        await createDirIfNotExist(runtime.folderDir)
        await this.downloadStream(runtime, 'durl')
      } else {
        throw new Error('未找到可用的视频流')
      }

      runtime.status = 'success'
      let fileSize = 0
      try {
        const stat = await fs.stat(runtime.finalPath)
        fileSize = stat.size
      } catch {
        logger.warn(`下载完成后无法读取文件大小: ${runtime.finalPath}`)
      }
      this.historyStore.markCompleted(bvid, runtime.finalPath, fileSize)
      this.emit('download:item:end', {
        bvid,
        title,
        success: true,
        message: '下载完成',
        outputPath: runtime.finalPath
      })
    } catch (error) {
      if (error instanceof DownloadPausedError || this.isPaused(runtime)) {
        this.emit('download:item:progress', {
          bvid,
          type: 'paused',
          progress: this.currentProgress(runtime)
        })
        return
      }

      const message = error instanceof Error ? error.message : String(error)
      runtime.status = 'fail'
      this.historyStore.markFailed(bvid)
      logger.error(`下载失败: ${title}`, error)
      this.emit('download:item:end', {
        bvid,
        title,
        success: false,
        message
      })
    }
  }

  /**
   * 获取视频 CID 与播放地址；refresh 时强制重新请求
   */
  private async fetchPlayUrls(runtime: TaskRuntime, refresh: boolean): Promise<void> {
    const { bvid } = runtime.task
    if (runtime.playUrlFetched && !refresh) return

    if (!runtime.cid) {
      const viewRes = await this.httpClient.get('https://api.bilibili.com/x/web-interface/view', {
        searchParams: { bvid }
      })
      const viewData = viewRes.data as { cid?: number } | null
      if (!viewData?.cid) {
        throw new Error('获取视频信息失败')
      }
      runtime.cid = viewData.cid
    }

    const signedParams = await getWbiSignedParams(this.httpClient, {
      bvid,
      cid: runtime.cid,
      qn: 80,
      fnval: 4048,
      fnver: 0,
      fourk: 1
    })
    const playRes = await this.httpClient.get('https://api.bilibili.com/x/player/wbi/playurl', {
      searchParams: signedParams
    })
    const playData = playRes.data as PlayUrlData | null
    if (!playData) {
      throw new Error('获取视频流失败')
    }

    const dashVideo = playData.dash?.video?.[0]
    const dashAudio = playData.dash?.audio?.[0]
    const durl = playData.durl?.[0]
    const nextMode: DownloadMode | null = dashVideo && dashAudio ? 'dash' : durl ? 'durl' : null
    if (!nextMode) {
      throw new Error('未找到可用的视频流')
    }

    if (runtime.mode && runtime.mode !== nextMode) {
      // 流类型发生变化（dash <-> durl），丢弃旧进度重新下载
      logger.warn(`视频流类型变化: ${runtime.mode} -> ${nextMode}，重新下载 ${bvid}`)
      runtime.streams = {}
      runtime.stage = nextMode === 'dash' ? 'video' : 'durl'
      if (runtime.tempDir) {
        await fs.rm(runtime.tempDir, { recursive: true, force: true }).catch(() => undefined)
        runtime.tempDir = null
      }
    }
    runtime.mode = nextMode
    runtime.playUrlFetched = true

    if (nextMode === 'dash') {
      runtime.tempDir = runtime.tempDir ?? path.join(runtime.folderDir, `.${bvid}.tmp`)
      this.upsertStream(runtime, 'video', {
        url: dashVideo?.baseUrl,
        backupUrls: dashVideo?.backupUrl || [],
        destPath: path.join(runtime.tempDir, 'video.m4s')
      })
      this.upsertStream(runtime, 'audio', {
        url: dashAudio?.baseUrl,
        backupUrls: dashAudio?.backupUrl || [],
        destPath: path.join(runtime.tempDir, 'audio.m4s')
      })
    } else {
      this.upsertStream(runtime, 'durl', {
        url: durl?.url,
        backupUrls: durl?.backup_url || [],
        destPath: runtime.finalPath
      })
    }
  }

  private upsertStream(
    runtime: TaskRuntime,
    kind: StreamKind,
    info: { url: string | undefined; backupUrls: string[]; destPath: string }
  ): void {
    const existing = runtime.streams[kind]
    if (existing) {
      existing.url = info.url
      existing.backupUrls = info.backupUrls
    } else {
      runtime.streams[kind] = {
        kind,
        url: info.url,
        backupUrls: info.backupUrls,
        destPath: info.destPath,
        received: 0,
        total: 0,
        completed: false
      }
    }
  }

  /**
   * 下载单个流，失败时尝试备用地址并刷新一次播放地址
   */
  private async downloadStream(runtime: TaskRuntime, kind: StreamKind): Promise<void> {
    const initial = runtime.streams[kind]
    if (!initial || initial.completed) return
    let current: StreamRuntime = initial
    if (this.isPaused(runtime)) {
      throw new DownloadPausedError('任务已暂停')
    }

    runtime.stage = kind
    let candidates = this.streamCandidates(current)
    let refreshed = false
    let lastError: unknown

    while (true) {
      for (const url of candidates) {
        if (this.isPaused(runtime)) {
          throw new DownloadPausedError('任务已暂停')
        }

        try {
          // 已完成但未标记的边界情况（例如断点等于总大小）
          if (current.total > 0 && current.received >= current.total) {
            current.completed = true
            return
          }

          const offset = await this.prepareResume(current)
          await this.httpClient.downloadFile(
            url,
            current.destPath,
            (percent, received, total) => {
              current.received = received
              current.total = total
              this.emit('download:item:progress', {
                bvid: runtime.task.bvid,
                type: 'downloading',
                progress: this.streamOverallProgress(runtime, kind, percent)
              })
            },
            {
              offset,
              signal: runtime.abort?.signal,
              onResponse: info => {
                current.total = info.totalSize
              },
              validateResponse: info => {
                if (current.total > 0 && info.totalSize > 0 && info.totalSize !== current.total) {
                  return '文件内容或大小已变化，需要重新下载'
                }
                return undefined
              }
            }
          )

          await this.syncReceivedFromFile(current)
          current.completed = true
          logger.info(`下载完成: ${runtime.task.bvid} ${kind}`)
          return
        } catch (error) {
          if (error instanceof DownloadPausedError || this.isPaused(runtime)) {
            await this.syncReceivedFromFile(current)
            throw error
          }

          const code = (error as NodeJS.ErrnoException).code
          if (code === 'RANGE_NOT_SUPPORTED' || code === 'RESUME_MISMATCH') {
            await this.resetStream(current)
            lastError = error
            continue
          }

          await this.syncReceivedFromFile(current)
          lastError = error
          logger.warn(`下载地址失败，尝试备用地址: ${runtime.task.bvid} ${url}`)
        }
      }

      if (!refreshed) {
        refreshed = true
        try {
          logger.warn(`刷新播放地址后重试: ${runtime.task.bvid}`)
          await this.fetchPlayUrls(runtime, true)
          const refreshedStream = runtime.streams[kind]
          if (!refreshedStream) {
            throw new Error('刷新播放地址后流信息丢失')
          }
          current = refreshedStream
          candidates = this.streamCandidates(current)
          if (candidates.length === 0) {
            throw new Error('刷新后仍无可用下载地址')
          }
          continue
        } catch (error) {
          logger.error(`刷新播放地址失败: ${runtime.task.bvid}`, error)
          throw lastError
        }
      }

      throw lastError
    }
  }

  private isPaused(runtime: TaskRuntime): boolean {
    return runtime.status === 'paused'
  }

  private streamCandidates(stream: StreamRuntime): string[] {
    return [stream.url, ...stream.backupUrls].filter((item): item is string => Boolean(item))
  }

  /**
   * 恢复前校验本地临时文件大小，不一致则从头下载
   */
  private async prepareResume(stream: StreamRuntime): Promise<number> {
    if (stream.received <= 0) return 0
    try {
      const stat = await fs.stat(stream.destPath)
      if (stat.size === stream.received) {
        return stream.received
      }
      logger.warn(`临时文件大小与断点不一致，重新下载: ${stream.destPath}`)
    } catch {
      logger.warn(`临时文件不存在，重新下载: ${stream.destPath}`)
    }
    await this.resetStream(stream)
    return 0
  }

  private async resetStream(stream: StreamRuntime): Promise<void> {
    await fs.rm(stream.destPath, { force: true }).catch(() => undefined)
    stream.received = 0
    stream.total = 0
  }

  private async syncReceivedFromFile(stream: StreamRuntime): Promise<void> {
    try {
      const stat = await fs.stat(stream.destPath)
      stream.received = stat.size
    } catch {
      stream.received = 0
    }
  }

  /**
   * 当前任务总进度（0-100）
   */
  private currentProgress(runtime: TaskRuntime): number {
    if (runtime.mode === 'durl') {
      const stream = runtime.streams.durl
      return stream && stream.total > 0 ? Math.min(100, Math.round((stream.received / stream.total) * 100)) : 0
    }

    const video = runtime.streams.video
    const audio = runtime.streams.audio
    const videoProgress = video && video.total > 0 ? Math.min(50, Math.round((video.received / video.total) * 50)) : 0
    const audioProgress = audio && audio.total > 0 ? Math.min(50, Math.round((audio.received / audio.total) * 50)) : 0
    return videoProgress + audioProgress
  }

  private streamOverallProgress(runtime: TaskRuntime, kind: StreamKind, streamPercent: number): number {
    if (runtime.mode !== 'dash') return streamPercent
    return kind === 'video' ? Math.round(streamPercent / 2) : 50 + Math.round(streamPercent / 2)
  }
}
