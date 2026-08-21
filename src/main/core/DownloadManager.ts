import { clampConcurrent } from '@shared/concurrent'
import {
  clampDownloadCodec,
  clampDownloadQn,
  dashMediaBackups,
  dashMediaUrl,
  downloadTaskId,
  extractDownloadQns,
  pickDashAudio,
  pickDashVideo,
  type DashMedia,
  type DownloadCodecPref,
  type DownloadQn,
  type DownloadQualitiesQuery
} from '@shared/download'
import { DownloadEventMap, DownloadProgressStatus, DownloadTaskKey, DownloadVideoTask } from '@shared/types'
import { EventEmitter } from 'node:events'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createDirIfNotExist, sanitizeFileName } from '../utils'
import { getWbiSignedParams } from '../utils/wbi'
import { ComposEngine } from './ComposEngine'
import ConfigManager from './ConfigManager'
import DownloadHistoryStore from './DownloadHistoryStore'
import type Engine from './Engine'
import HttpClient from './HttpClient'
import logger from './Logger'
import ProcessQueue from './ProcessQueue'

type DashData = {
  video?: DashMedia[]
  audio?: DashMedia[]
}

type DurlStream = {
  url: string
  backup_url?: string[]
}

type PlayUrlQuery = {
  bvid: string
  cid: number
  qn: number
  epId?: number
}

type PlayUrlData = {
  dash?: DashData
  durl?: DurlStream[]
  accept_quality?: number[]
  support_formats?: Array<{ quality?: number }>
  quality?: number
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
  playUrlFetched: boolean
  folderDir: string
  finalPath: string
  tempDir: string | null
  streams: Partial<Record<StreamKind, StreamRuntime>>
  abort?: AbortController
  mergeEngine: Engine | null
  cancelled: boolean
  qn: DownloadQn
  codec: DownloadCodecPref
  /** 已在队列中或正在执行 handleTask，防止 pause/resume 重复入队 */
  busy: boolean
}

class DownloadPausedError extends Error {}

class DownloadCancelledError extends Error {
  constructor() {
    super('已取消')
    this.name = 'DownloadCancelledError'
  }
}

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
   * 设置并行下载任务数（1/2/4/8）
   */
  public setConcurrency(count: number): void {
    this.queue.setConcurrency(clampConcurrent(count))
  }

  /**
   * 探测稿件/分 P 实际可下载的清晰度（playurl accept_quality / dash.video.id）
   */
  public async listQualities(query: DownloadQualitiesQuery): Promise<DownloadQn[]> {
    if (!query.bvid || !Number.isFinite(query.cid) || query.cid <= 0) return []
    try {
      const playQuery: PlayUrlQuery = { bvid: query.bvid, cid: query.cid, qn: 120, epId: query.epId }
      const playData =
        query.kind === 'ogv' ? await this.fetchOgvPlayData(playQuery) : await this.fetchUgcPlayData(playQuery)
      if (!playData) return []
      return extractDownloadQns(playData)
    } catch (error) {
      logger.warn(`获取清晰度失败: ${query.bvid}:${query.cid}`, error)
      return []
    }
  }

  /**
   * 开始下载任务；任务已存在时视为恢复/重试
   */
  public start(task: DownloadVideoTask): void {
    if (!Number.isFinite(task.cid) || task.cid <= 0) {
      logger.warn(`忽略无效下载任务: ${task.bvid} cid=${String(task.cid)}`)
      return
    }
    task.page = task.page > 0 ? task.page : 1
    task.pages = task.pages > 0 ? task.pages : 1
    task.part = task.part || ''
    const key = downloadTaskId(task.bvid, task.cid)
    const runtime = this.tasks.get(key)
    if (runtime) {
      if (runtime.status === 'waiting' || runtime.status === 'downloading' || runtime.busy) {
        return
      }
      if (runtime.status === 'success' || runtime.cancelled) {
        logger.info(`重新下载: ${key}`)
        this.tasks.delete(key)
        const newRuntime = this.createRuntime(task)
        this.tasks.set(key, newRuntime)
        this.enqueue(newRuntime)
        return
      }
      this.enqueue(runtime)
      return
    }

    const newRuntime = this.createRuntime(task)
    this.tasks.set(key, newRuntime)
    this.enqueue(newRuntime)
  }

  /**
   * 暂停下载任务；合并阶段不可暂停
   */
  public pause(key: DownloadTaskKey): void {
    const runtime = this.getRuntime(key)
    if (!runtime) return
    if (runtime.cancelled) return
    if (runtime.status === 'paused' || runtime.status === 'success' || runtime.status === 'fail') return
    if (runtime.stage === 'merge') return

    runtime.status = 'paused'
    runtime.abort?.abort()
    this.emitProgress(runtime, 'paused', this.currentProgress(runtime))
    logger.debug(`下载任务已暂停: ${downloadTaskId(key.bvid, key.cid)}`)
  }

  /**
   * 恢复已暂停的下载任务
   */
  public resume(key: DownloadTaskKey): void {
    const runtime = this.getRuntime(key)
    if (!runtime || runtime.cancelled || runtime.status !== 'paused') return
    this.enqueue(runtime)
  }

  /**
   * 取消任务：中止下载、合并阶段杀掉 MP4Box，删除临时目录与记录
   */
  public cancel(key: DownloadTaskKey): void {
    const runtime = this.getRuntime(key)
    if (!runtime) return
    if (runtime.status === 'success' || runtime.cancelled) return

    runtime.cancelled = true
    runtime.abort?.abort()
    runtime.mergeEngine?.stop()
    logger.debug(`下载任务已取消: ${downloadTaskId(key.bvid, key.cid)}`)

    if (!runtime.busy) {
      void this.finalizeCancel(runtime)
    }
  }

  private getRuntime(key: DownloadTaskKey): TaskRuntime | undefined {
    return this.tasks.get(downloadTaskId(key.bvid, key.cid))
  }

  private taskKey(runtime: TaskRuntime): DownloadTaskKey {
    return { bvid: runtime.task.bvid, cid: runtime.task.cid }
  }

  private createRuntime(task: DownloadVideoTask): TaskRuntime {
    const downloadConfig = this.configManager.getStore()['download-config']
    const outputDir = downloadConfig.outputDir
    const titlePart = sanitizeFileName(task.title)
    const partSuffix =
      task.pages > 1 || task.page > 1 ? `-P${task.page}-${sanitizeFileName(task.part || `P${task.page}`)}` : ''
    const finalPath = path.join(outputDir, `[${task.bvid}]-[${task.uname}]-${titlePart}${partSuffix}.mp4`)
    const folderDir = path.dirname(finalPath)

    return {
      task,
      status: 'waiting',
      stage: 'video',
      playUrlFetched: false,
      folderDir,
      finalPath,
      tempDir: null,
      streams: {},
      mergeEngine: null,
      cancelled: false,
      qn: clampDownloadQn(task.qn ?? downloadConfig.qn),
      codec: clampDownloadCodec(downloadConfig.codec),
      busy: false
    }
  }

  private enqueue(runtime: TaskRuntime): void {
    runtime.status = 'waiting'
    if (runtime.busy) return

    runtime.busy = true
    this.queue
      .add(() => this.handleTask(runtime))
      .catch(error => {
        if (
          error instanceof DownloadPausedError ||
          error instanceof DownloadCancelledError ||
          this.isPaused(runtime) ||
          runtime.cancelled ||
          this.isAbortError(error)
        ) {
          return
        }
        logger.error(`下载任务队列执行失败: ${runtime.task.title}`, error)
      })
      .finally(() => {
        runtime.busy = false
        if (runtime.cancelled) {
          void this.finalizeCancel(runtime)
          return
        }
        if (runtime.status === 'waiting') {
          this.enqueue(runtime)
        }
      })
  }

  /**
   * 处理单个下载任务
   */
  private async handleTask(runtime: TaskRuntime): Promise<void> {
    const { bvid, cid, title } = runtime.task
    if (runtime.cancelled) throw new DownloadCancelledError()
    if (runtime.status === 'paused') return

    runtime.status = 'downloading'
    runtime.abort = new AbortController()
    this.emit('download:item:start', { bvid, cid, title })
    this.emitProgress(runtime, 'downloading', this.currentProgress(runtime))
    this.historyStore.markStarted(runtime.task)

    try {
      this.throwIfCancelled(runtime)
      await this.fetchPlayUrls(runtime, runtime.playUrlFetched)

      if (runtime.mode === 'dash' && runtime.tempDir) {
        await createDirIfNotExist(runtime.tempDir)
        await this.downloadStream(runtime, 'video')
        await this.downloadStream(runtime, 'audio')

        this.throwIfCancelled(runtime)
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
          signal: runtime.abort.signal,
          bindEngine: engine => {
            runtime.mergeEngine = engine
          },
          onProgress: (type, progress) => {
            this.emitProgress(runtime, type, progress)
          }
        })
        this.throwIfCancelled(runtime)
        await fs.rm(runtime.tempDir, { recursive: true, force: true })
      } else if (runtime.mode === 'durl') {
        await createDirIfNotExist(runtime.folderDir)
        await this.downloadStream(runtime, 'durl')
      } else {
        throw new Error('未找到可用的视频流')
      }

      this.throwIfCancelled(runtime)
      runtime.status = 'success'
      let fileSize = 0
      try {
        const stat = await fs.stat(runtime.finalPath)
        fileSize = stat.size
      } catch {
        logger.warn(`下载完成后无法读取文件大小: ${runtime.finalPath}`)
      }
      this.historyStore.markCompleted(this.taskKey(runtime), runtime.finalPath, fileSize)
      this.emit('download:item:end', {
        bvid,
        cid,
        title,
        success: true,
        message: '下载完成',
        outputPath: runtime.finalPath
      })
    } catch (error) {
      if (runtime.cancelled || error instanceof DownloadCancelledError) {
        throw new DownloadCancelledError()
      }

      if (this.isPaused(runtime)) {
        this.emitProgress(runtime, 'paused', this.currentProgress(runtime))
        return
      }

      if (error instanceof DownloadPausedError || this.isAbortError(error)) {
        if (this.shouldRetryAfterAbort(runtime)) return
        this.emitProgress(runtime, 'paused', this.currentProgress(runtime))
        return
      }

      const message = error instanceof Error ? error.message : String(error)
      runtime.status = 'fail'
      this.historyStore.markFailed(this.taskKey(runtime))
      logger.error(`下载失败: ${title}`, error)
      this.emit('download:item:end', {
        bvid,
        cid,
        title,
        success: false,
        message
      })
    }
  }

  private async fetchUgcPlayData(query: PlayUrlQuery): Promise<PlayUrlData | null> {
    const signedParams = await getWbiSignedParams(this.httpClient, {
      bvid: query.bvid,
      cid: query.cid,
      qn: query.qn,
      fnval: 4048,
      fnver: 0,
      fourk: 1
    })
    const playRes = await this.httpClient.get('https://api.bilibili.com/x/player/wbi/playurl', {
      searchParams: signedParams
    })
    if (playRes.code !== 0) {
      throw new Error(playRes.message || '获取视频流失败')
    }
    return (playRes.data as PlayUrlData | null) ?? null
  }

  private async fetchOgvPlayData(query: PlayUrlQuery): Promise<PlayUrlData | null> {
    const playRes = await this.httpClient.get('https://api.bilibili.com/pgc/player/web/playurl', {
      searchParams: {
        bvid: query.bvid,
        cid: query.cid,
        ...(query.epId ? { ep_id: query.epId } : {}),
        qn: query.qn,
        fnval: 4048,
        fnver: 0,
        fourk: 1
      }
    })
    if (playRes.code !== 0) {
      throw new Error(playRes.message || '获取番剧视频流失败')
    }
    return ((playRes.result ?? playRes.data) as PlayUrlData | null) ?? null
  }

  /**
   * 获取视频 CID 与播放地址；refresh 时强制重新请求
   */
  private async fetchPlayUrls(runtime: TaskRuntime, refresh: boolean): Promise<void> {
    const { bvid, cid, epId } = runtime.task
    if (runtime.playUrlFetched && !refresh) return

    const playQuery: PlayUrlQuery = { bvid, cid, qn: runtime.qn, epId }
    const playData =
      runtime.task.kind === 'ogv' ? await this.fetchOgvPlayData(playQuery) : await this.fetchUgcPlayData(playQuery)
    if (!playData) {
      throw new Error('获取视频流失败')
    }

    const dashVideo = pickDashVideo(playData.dash?.video ?? [], runtime.qn, runtime.codec)
    const dashAudio = pickDashAudio(playData.dash?.audio ?? [])
    const durl = playData.durl?.[0]
    const nextMode: DownloadMode | null = dashVideo && dashAudio ? 'dash' : durl ? 'durl' : null
    if (!nextMode) {
      throw new Error('未找到可用的视频流')
    }

    if (runtime.mode && runtime.mode !== nextMode) {
      logger.warn(`视频流类型变化: ${runtime.mode} -> ${nextMode}，重新下载 ${bvid}:${cid}`)
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
      runtime.tempDir = runtime.tempDir ?? path.join(runtime.folderDir, `.${bvid}.${cid}.tmp`)
      this.upsertStream(runtime, 'video', {
        url: dashMediaUrl(dashVideo as DashMedia),
        backupUrls: dashMediaBackups(dashVideo as DashMedia),
        destPath: path.join(runtime.tempDir, 'video.m4s')
      })
      this.upsertStream(runtime, 'audio', {
        url: dashMediaUrl(dashAudio as DashMedia),
        backupUrls: dashMediaBackups(dashAudio as DashMedia),
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
    this.throwIfCancelled(runtime)
    if (this.isPaused(runtime)) {
      throw new DownloadPausedError('任务已暂停')
    }

    runtime.stage = kind
    let candidates = this.streamCandidates(current)
    let refreshed = false
    let lastError: unknown

    while (true) {
      for (const url of candidates) {
        this.throwIfCancelled(runtime)
        if (this.isPaused(runtime)) {
          throw new DownloadPausedError('任务已暂停')
        }

        try {
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
              this.emitProgress(runtime, 'downloading', this.streamOverallProgress(runtime, kind, percent))
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
          logger.info(`下载完成: ${runtime.task.bvid}:${runtime.task.cid} ${kind}`)
          return
        } catch (error) {
          if (runtime.cancelled || error instanceof DownloadCancelledError) {
            await this.syncReceivedFromFile(current)
            throw new DownloadCancelledError()
          }
          if (error instanceof DownloadPausedError || this.isPaused(runtime)) {
            await this.syncReceivedFromFile(current)
            throw error instanceof DownloadPausedError ? error : new DownloadPausedError('任务已暂停')
          }
          if (this.isAbortError(error)) {
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
          logger.warn(`下载地址失败，尝试备用地址: ${runtime.task.bvid}:${runtime.task.cid} ${url}`)
        }
      }

      if (!refreshed) {
        refreshed = true
        try {
          logger.warn(`刷新播放地址后重试: ${runtime.task.bvid}:${runtime.task.cid}`)
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
          if (runtime.cancelled || error instanceof DownloadCancelledError) {
            throw new DownloadCancelledError()
          }
          logger.error(`刷新播放地址失败: ${runtime.task.bvid}:${runtime.task.cid}`, error)
          throw lastError
        }
      }

      throw lastError
    }
  }

  private async finalizeCancel(runtime: TaskRuntime): Promise<void> {
    if (runtime.status === 'success') return
    runtime.status = 'fail'
    if (runtime.tempDir) {
      await fs.rm(runtime.tempDir, { recursive: true, force: true }).catch(() => undefined)
      runtime.tempDir = null
    }
    await fs.rm(runtime.finalPath, { force: true }).catch(() => undefined)
    runtime.streams = {}
    runtime.playUrlFetched = false
    this.historyStore.remove(this.taskKey(runtime), true)
    this.emit('download:item:end', {
      bvid: runtime.task.bvid,
      cid: runtime.task.cid,
      title: runtime.task.title,
      success: false,
      message: '已取消',
      cancelled: true
    })
  }

  private emitProgress(runtime: TaskRuntime, type: DownloadProgressStatus, progress: number): void {
    this.emit('download:item:progress', {
      bvid: runtime.task.bvid,
      cid: runtime.task.cid,
      type,
      progress
    })
  }

  private throwIfCancelled(runtime: TaskRuntime): void {
    if (runtime.cancelled) throw new DownloadCancelledError()
  }

  private isPaused(runtime: TaskRuntime): boolean {
    return runtime.status === 'paused'
  }

  private shouldRetryAfterAbort(runtime: TaskRuntime): boolean {
    return runtime.status === 'waiting'
  }

  private isAbortError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false
    const name = 'name' in error ? String(error.name) : ''
    const code = 'code' in error ? String((error as { code?: unknown }).code) : ''
    return name === 'AbortError' || code === 'ABORT_ERR'
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
