import {
  ComposEventMap,
  CompositionOptions,
  ConfigOptions,
  ConvertPrescanResult,
  EngineResponse,
  ProcessItemProgressArgs,
  VideoTaskInfo
} from '@shared/types'
import { EventEmitter } from 'node:events'
import fs from 'node:fs/promises'
import path from 'node:path'
import { MP3_SUFFIX, MP4_SUFFIX, OUTPUT_DIR_NAME, PLAYURL_FILE_NAME, VIDEO_INFO_FILE_NAME } from '../config/constants'
import { createDirIfNotExist, getEngineBinPath, isExist, isValidFile, mapLimit, sanitizeFileName } from '../utils'
import ConfigManager from './ConfigManager'
import ConvertHistoryStore from './ConvertHistoryStore'
import Engine from './Engine'
import logger from './Logger'
import ProcessQueue from './ProcessQueue'

export type ConvertTaskResult = {
  duration: number
  skipped: boolean
  fileSize: number
}

export class ComposEngine extends EventEmitter<ComposEventMap> {
  private configManager: ConfigManager
  private processQueue: ProcessQueue<ConvertTaskResult>
  private historyStore: ConvertHistoryStore
  private isRunning = false
  private isPrescanning = false
  private currentRunId: string | null = null
  private currentOrder = new Map<string, number>()

  constructor(
    processQueue: ProcessQueue<ConvertTaskResult>,
    configManager: ConfigManager,
    historyStore: ConvertHistoryStore
  ) {
    super()
    this.configManager = configManager
    this.processQueue = processQueue
    this.historyStore = historyStore
  }

  /**
   * 缓存扫描：成品对账 + 扫描缓存并写入 scanned
   */
  public async prescan(): Promise<ConvertPrescanResult> {
    if (this.isPrescanning || this.isRunning) {
      return {
        pending: this.historyStore.countWaitingConvert(),
        inserted: 0,
        cacheOk: true,
        message: '已有缓存扫描或转换正在进行'
      }
    }

    this.isPrescanning = true
    try {
      this.historyStore.reconcile()

      const config = this.configManager.store.get('convert-config')
      const cachePath = config.cachePath
      const cacheErrMessage = await isValidFile(cachePath, fs.constants.R_OK)
      if (cacheErrMessage) {
        logger.warn(`缓存扫描跳过缓存目录: ${cacheErrMessage}`)
        return {
          pending: this.historyStore.countWaitingConvert(),
          inserted: 0,
          cacheOk: false,
          message: '无效的缓存目录，请在设置中选择 B 站客户端缓存路径'
        }
      }

      const rawBVS = await this.generateBVS(cachePath)
      const [validBVS] = await this.pickupBVS(rawBVS, { silent: true })
      const finished = this.historyStore.getFinishedBvids()
      const keepBvids: string[] = []
      let inserted = 0

      validBVS.forEach((bv, index) => {
        if (!bv.bvid || finished.has(bv.bvid)) return
        keepBvids.push(bv.bvid)
        if (this.historyStore.markScanned(bv, index)) inserted += 1
      })

      this.historyStore.removeStaleScanned(keepBvids)

      return {
        pending: this.historyStore.countWaitingConvert(),
        inserted,
        cacheOk: true
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`缓存扫描失败: ${message}`)
      return {
        pending: this.historyStore.countWaitingConvert(),
        inserted: 0,
        cacheOk: false,
        message
      }
    } finally {
      this.isPrescanning = false
    }
  }

  /**
   * 转换库中待处理任务（缓存扫描 / 失败 / 中断 / 丢失）
   */
  public async run(): Promise<void> {
    if (this.isRunning) {
      logger.warn('已在合成中，忽略重复请求')
      return
    }

    if (this.isPrescanning) {
      this.emit('convert:broke', { reason: '缓存扫描尚未结束，请稍后再转换' })
      return
    }

    this.isRunning = true
    try {
      this.currentRunId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      this.emit('convert:start')

      const config = this.configManager.store.get('convert-config')
      const gpacBinPath = getEngineBinPath(this.configManager.context.platform)

      const gpacErrMessage = await isValidFile(gpacBinPath, fs.constants.X_OK)
      const isValidEngine = await this.checkEngine()
      if (gpacErrMessage || !isValidEngine) {
        logger.error(gpacErrMessage)
        this.emit('convert:broke', {
          reason: '无效的MP4Box可执行文件，请检查配置'
        })
        return
      }

      const pending = this.historyStore.listPendingConvert()
      const rebuilt = await mapLimit(pending, 4, async item => {
        if (!item.sourceDir) return null
        return this.getVideoTaskInfo(item.sourceDir)
      })
      const validBVS = rebuilt.filter((info): info is VideoTaskInfo =>
        Boolean(info?.bvid && info.fileInfo.videoM4sPath)
      )

      if (validBVS.length === 0) {
        this.emit('convert:broke', {
          reason: '没有待转换的任务，请先缓存扫描'
        })
        return
      }

      await this.syntheticTask(validBVS, config)
    } catch (error) {
      const message = `合成失败: ${error instanceof Error ? error.message : String(error)}`
      logger.error(message)
      this.emit('convert:broke', {
        reason: message
      })
    } finally {
      this.isRunning = false
    }
  }

  /**
   * 视频转换合成
   * @param bvs bvs列表
   */
  private async syntheticTask(bvs: VideoTaskInfo[], config: ConfigOptions): Promise<void> {
    const { outputDir, replaceExisting } = config

    const taskFn = async (bv: VideoTaskInfo, outputFilePath: string) => {
      const { videoM4sPath, videoMp4Path, audioM4sPath, audioMp3Path } = bv.fileInfo

      logger.info(`开始转换: (${bv.bvid}) - (${bv.fileInfo.fileName})`)

      // 开始时间戳
      const start = new Date().getTime()

      // 转换 (Transform)
      // 视频
      const isVideoExist = await isExist(videoMp4Path)
      if (!isVideoExist || replaceExisting) {
        await this.transformFile(videoM4sPath, videoMp4Path)
        const message = `已转换视频${replaceExisting ? '（覆盖）' : ''}: ${videoM4sPath} -> ${videoMp4Path}`
        logger.debug(message)
        this.emit('convert:item:progress', {
          bvid: bv.bvid,
          type: 'preprocess',
          progress: 0
        })
      } else {
        const message = `视频已存在,跳过转换: ${videoMp4Path}`
        logger.debug(message)
        this.emit('convert:item:progress', {
          bvid: bv.bvid,
          type: 'preprocess',
          progress: 0
        })
      }

      // 音频
      const isAudioExist = await isExist(audioMp3Path)
      if (!isAudioExist || replaceExisting) {
        await this.transformFile(audioM4sPath, audioMp3Path)
        const message = `已转换音频${replaceExisting ? '（覆盖）' : ''}: ${audioM4sPath} -> ${audioMp3Path}`
        logger.debug(message)
        this.emit('convert:item:progress', {
          bvid: bv.bvid,
          type: 'preprocess',
          progress: 0
        })
      } else {
        const message = `音频已存在,跳过转换: ${audioMp3Path}`
        logger.debug(message)
        this.emit('convert:item:progress', {
          bvid: bv.bvid,
          type: 'preprocess',
          progress: 0
        })
      }

      // 合成 (Composition)
      const isOutputExist = await isExist(outputFilePath)
      if (!isOutputExist || replaceExisting) {
        await this.muxWithEngine({
          bvInfo: bv,
          videoFile: videoMp4Path,
          audioFile: audioMp3Path,
          outputFile: outputFilePath
        })
        const message = `已合成文件${replaceExisting ? '（覆盖）' : ''}: ${outputFilePath}`
        logger.debug(message)
      } else {
        const message = `合成文件已存在,跳过: ${outputFilePath}`
        logger.debug(message)
      }

      const duration = new Date().getTime() - start
      const skipped = isOutputExist && !replaceExisting
      const stat = await fs.stat(outputFilePath).catch(() => null)
      // 合成成功且产物仍在时清理中间转换文件，避免缓存目录长期翻倍占用磁盘
      if (stat) {
        await Promise.all([
          fs.rm(videoMp4Path, { force: true }).catch(() => undefined),
          fs.rm(audioMp3Path, { force: true }).catch(() => undefined)
        ])
        logger.info(`已清理中间产物: ${videoMp4Path}, ${audioMp3Path}`)
      }
      return { duration, skipped, fileSize: stat?.size ?? 0 }
    }

    return new Promise(resolve => {
      const count = { success: 0, fail: 0 }

      this.currentOrder = new Map(bvs.map((bv, index) => [bv.bvid, index]))
      this.emit('convert:ready', {
        bvs: bvs
      })

      // 启动队列任务
      logger.info('启动队列任务:', `总任务数: [${bvs.length}]`)

      bvs.forEach(bv => {
        const outputFilePath = path.join(outputDir, bv.fileInfo.fileName)
        this.processQueue
          .add(() => {
            this.markItemStarted(bv, outputFilePath)
            this.emit('convert:item:start', { bv, outputPath: outputFilePath })
            return taskFn(bv, outputFilePath)
          })
          .then(({ duration, skipped, fileSize }) => {
            count.success += 1
            const end = {
              bvid: bv.bvid,
              success: true,
              message: `耗时: ${duration} ms${skipped ? '（已跳过合成）' : ''}`,
              outputPath: outputFilePath,
              durationMs: duration,
              skipped,
              fileSize
            }
            this.markItemEnded(end)
            this.emit('convert:item:end', end)
          })
          .catch(error => {
            count.fail += 1
            const end = {
              bvid: bv.bvid,
              success: false,
              message: error instanceof Error ? error.message : String(error),
              outputPath: outputFilePath,
              skipped: false
            }
            this.markItemEnded(end)
            this.emit('convert:item:end', end)
          })
      })
      this.processQueue.onIdle().then(() => {
        logger.info('所有任务已经完成')
        this.emit('convert:success', {
          count
        })
        resolve()
      })
    })
  }

  /**
   * 检查BVS并分类
   * @param bvs bvs列表
   * @returns [validBVS, invalidBVS]
   */
  private async pickupBVS(bvs: VideoTaskInfo[], options?: { silent?: boolean }) {
    if (bvs.length === 0) {
      return [[], []]
    }
    const results = await mapLimit(bvs, 4, async bv => {
      const { videoM4sPath, audioM4sPath } = bv.fileInfo

      // 视频未缓存完成
      if (bv.status !== 'completed') {
        const message = `未缓存完成,跳过合成: ${bv.fileInfo.fileName}`
        logger.warn(message)
        if (!options?.silent) {
          this.emit('convert:item:progress', {
            bvid: bv.bvid,
            type: 'preprocess',
            progress: 0
          })
        }
        return false
      }

      // 检查视频源文件
      const videoValidError = await isValidFile(videoM4sPath, fs.constants.R_OK)
      if (videoValidError) {
        const message = `${videoValidError}: ${videoM4sPath}, 跳过处理`
        logger.warn(message)
        if (!options?.silent) {
          this.emit('convert:item:progress', {
            bvid: bv.bvid,
            type: 'preprocess',
            progress: 0
          })
        }
        return false
      }

      // 检查音频源文件
      const audioValidError = await isValidFile(audioM4sPath, fs.constants.R_OK)
      if (audioValidError) {
        const message = `${audioValidError}, 跳过: ${audioM4sPath}`
        logger.warn(message)
        if (!options?.silent) {
          this.emit('convert:item:progress', {
            bvid: bv.bvid,
            type: 'preprocess',
            progress: 0
          })
        }
        return false
      }

      return true
    })

    const validBVS = bvs.filter((_, index) => results[index])
    const inValidBVS = bvs.filter((_, index) => !results[index])
    return [validBVS, inValidBVS]
  }

  /**
   * 扫描缓存目录生成任务列表
   */
  private async generateBVS(cachePath: string): Promise<VideoTaskInfo[]> {
    try {
      const cacheDirs = await this.getCacheDirs(cachePath)
      if (cacheDirs.length === 0) {
        return []
      }
      const taskInfos = await mapLimit(cacheDirs, 4, cacheDir => this.getVideoTaskInfo(cacheDir))
      return taskInfos.filter((info): info is VideoTaskInfo => Boolean(info))
    } catch (error) {
      logger.error(`扫描缓存失败: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  /**
   * 获取缓存目录下所有子目录（排除 output 目录）
   * @param cachePath 缓存根目录
   * @returns 缓存子目录数组
   */
  private async getCacheDirs(cachePath: string): Promise<string[]> {
    const dirs: string[] = []

    try {
      const entries = await fs.readdir(cachePath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(cachePath, entry.name)
        if (entry.isDirectory() && entry.name !== OUTPUT_DIR_NAME) {
          dirs.push(fullPath)
        }
      }

      return dirs
    } catch (error) {
      logger.error(`获取缓存目录失败: ${cachePath}, 错误: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  /**
   * 获取每个视频的相关信息
   * @param dirPath 视频目录的文件路径
   * @returns 视频信息
   */
  private async getVideoTaskInfo(dirPath: string): Promise<VideoTaskInfo | null> {
    const videoTaskInfo: VideoTaskInfo = {
      type: '',
      bvid: '',
      uname: '',
      coverUrl: '',
      coverPath: '',
      title: '',
      groupTitle: '',
      status: '',
      fileInfo: {
        fileName: '',
        dirPath: '',
        filePath: '',
        videoM4sPath: '',
        audioM4sPath: '',
        videoMp4Path: '',
        audioMp3Path: ''
      }
    }
    try {
      const videoInfoPath = path.join(dirPath, VIDEO_INFO_FILE_NAME)
      const videoInfoContent = await fs.readFile(videoInfoPath, 'utf8')
      const videoInfoData = JSON.parse(videoInfoContent)

      videoTaskInfo.type = videoInfoData.type
      videoTaskInfo.bvid = videoInfoData.bvid
      videoTaskInfo.uname = videoInfoData.uname
      videoTaskInfo.coverUrl = videoInfoData.coverUrl
      videoTaskInfo.coverPath = videoInfoData.coverPath
      videoTaskInfo.title = videoInfoData.title
      videoTaskInfo.groupTitle = videoInfoData.groupTitle
      videoTaskInfo.status = videoInfoData.status

      const playUrlPath = path.join(dirPath, PLAYURL_FILE_NAME)
      const playUrlContent = await fs.readFile(playUrlPath, 'utf8')
      const playUrlData = JSON.parse(playUrlContent)
      const dash = playUrlData.data?.dash || playUrlData.result?.dash

      if (dash) {
        const videoUrl = dash.video[0].baseUrl
        const audioUrl = dash.audio[0].baseUrl

        const videoAffix = videoUrl.split('?')[0]
        const audioAffix = audioUrl.split('?')[0]

        const videoName = videoAffix.split('/').slice(-1)[0]
        const audioName = audioAffix.split('/').slice(-1)[0]

        const videoPath = path.join(dirPath, videoName)
        const audioPath = path.join(dirPath, audioName)

        const mp4Name = videoName.split('.')[0] + MP4_SUFFIX
        const mp3Name = audioName.split('.')[0] + MP3_SUFFIX

        const mp4Path = path.join(dirPath, mp4Name)
        const mp3Path = path.join(dirPath, mp3Name)

        videoTaskInfo.fileInfo.videoM4sPath = videoPath
        videoTaskInfo.fileInfo.audioM4sPath = audioPath
        videoTaskInfo.fileInfo.videoMp4Path = mp4Path
        videoTaskInfo.fileInfo.audioMp3Path = mp3Path
      }

      videoTaskInfo.fileInfo.dirPath = dirPath
      videoTaskInfo.fileInfo.fileName =
        `[${videoTaskInfo.bvid}]-[${videoTaskInfo.uname}]-${sanitizeFileName(videoTaskInfo.title)}` + MP4_SUFFIX
      videoTaskInfo.fileInfo.filePath = path.join(
        this.configManager.getStore()['convert-config'].outputDir,
        videoTaskInfo.fileInfo.fileName
      )

      return videoTaskInfo

      // 返回默认的视频和音频文件名
    } catch (error) {
      logger.error(`获取文件信息失败: ${error instanceof Error ? error.message : String(error)}`)
      return null
    }
  }

  private markItemStarted(bv: VideoTaskInfo, outputPath: string): void {
    if (!this.currentRunId) return
    this.historyStore.markStarted(this.currentRunId, bv, outputPath, this.currentOrder.get(bv.bvid) ?? 0)
  }

  private markItemEnded(data: {
    bvid: string
    success: boolean
    message: string
    outputPath?: string
    durationMs?: number
    skipped?: boolean
  }): void {
    if (!this.currentRunId) return
    this.historyStore.markEnded(this.currentRunId, data.bvid, {
      success: data.success,
      message: data.message,
      outputPath: data.outputPath,
      durationMs: data.durationMs,
      skipped: data.skipped
    })
  }

  /**
   * 转换文件（处理 m4s 头部）
   */
  private async transformFile(src: string, dst: string): Promise<void> {
    let srcFile: fs.FileHandle | null = null
    let dstFile: fs.FileHandle | null = null
    try {
      srcFile = await fs.open(src, 'r')
      dstFile = await fs.open(dst, 'w')

      // 读取前9个字节
      const buffer = Buffer.alloc(9)
      const { bytesRead } = await srcFile.read(buffer, 0, 9, 0)

      if (bytesRead < 9) {
        throw new Error(`读取文件头失败: ${src}`)
      }

      const header = buffer.toString()
      const isEncrypted = header === '000000000'

      // 如果不是加密头，需要把这9个字节写进去
      if (!isEncrypted) {
        await dstFile.write(buffer, 0, 9, 0)
      }

      // 复制剩余内容
      // 如果是加密头，我们从源文件第9字节开始读，写入目标文件第0字节
      // 如果不是加密头，我们从源文件第9字节开始读，写入目标文件第9字节（因为前9字节已经写了）
      const readStream = srcFile.createReadStream({ start: 9 })
      const writeStream = dstFile.createWriteStream({
        start: isEncrypted ? 0 : 9
      })

      await new Promise<void>((resolve, reject) => {
        readStream.on('error', reject)
        writeStream.on('error', reject)
        writeStream.on('finish', resolve)
        readStream.pipe(writeStream)
      })
    } catch (error) {
      logger.error(`转换文件失败: ${src} -> ${dst}, 错误: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    } finally {
      if (srcFile) await srcFile.close()
      if (dstFile) await dstFile.close()
    }
  }

  /**
   * 调用 MP4Box 合成；下载取消时可通过 signal 杀掉进程
   */
  private async muxWithEngine(
    options: CompositionOptions,
    extras?: {
      signal?: AbortSignal
      bindEngine?: (engine: Engine | null) => void
      onProgress?: (data: ProcessItemProgressArgs) => void
    }
  ): Promise<EngineResponse> {
    const binPath = getEngineBinPath(this.configManager.context.platform)
    const engine = new Engine(binPath, options)
    engine.on('convert:item:progress', data => {
      extras?.onProgress?.(data)
      if (!extras?.onProgress) this.emit('convert:item:progress', data)
    })

    const onAbort = (): void => {
      engine.stop()
    }
    extras?.signal?.addEventListener('abort', onAbort)
    extras?.bindEngine?.(engine)
    try {
      if (extras?.signal?.aborted) {
        const error = new Error('已取消')
        error.name = 'AbortError'
        throw error
      }
      return await engine.start()
    } finally {
      extras?.signal?.removeEventListener('abort', onAbort)
      extras?.bindEngine?.(null)
    }
  }

  /**
   * 合并下载的音视频文件（M4S）
   * @param params 合并参数
   */
  public async mergeFiles(params: {
    bvid: string
    title: string
    videoPath: string
    audioPath: string
    outputPath: string
    tempDir: string
    signal?: AbortSignal
    bindEngine?: (engine: Engine | null) => void
    onProgress?: (type: 'preprocess' | 'importing' | 'writing', progress: number) => void
  }): Promise<void> {
    const { bvid, videoPath, audioPath, outputPath, tempDir, signal, bindEngine, onProgress } = params

    const throwIfAborted = (): void => {
      if (signal?.aborted) {
        const error = new Error('已取消')
        error.name = 'AbortError'
        throw error
      }
    }

    throwIfAborted()
    await createDirIfNotExist(path.dirname(outputPath))
    await createDirIfNotExist(tempDir)

    const tempVideoPath = path.join(tempDir, 'video.mp4')
    const tempAudioPath = path.join(tempDir, 'audio.mp3')

    onProgress?.('preprocess', 0)
    await this.transformFile(videoPath, tempVideoPath)
    throwIfAborted()
    onProgress?.('preprocess', 50)
    await this.transformFile(audioPath, tempAudioPath)
    throwIfAborted()
    onProgress?.('preprocess', 100)

    await this.muxWithEngine(
      {
        bvInfo: { bvid } as VideoTaskInfo,
        videoFile: tempVideoPath,
        audioFile: tempAudioPath,
        outputFile: outputPath
      },
      {
        signal,
        bindEngine,
        onProgress: data => {
          const type = data.type === 'importing' || data.type === 'writing' ? data.type : 'preprocess'
          onProgress?.(type, data.progress)
        }
      }
    )
  }

  /**
   * 检查引擎是否可用
   * @returns 是否可用
   */
  public checkEngine(): Promise<boolean> {
    const gpacBinPath = getEngineBinPath(this.configManager.context.platform)
    const engine = new Engine(gpacBinPath, {
      bvInfo: {} as VideoTaskInfo,
      videoFile: '',
      audioFile: '',
      outputFile: ''
    })
    return engine.checkEngine()
  }
}
