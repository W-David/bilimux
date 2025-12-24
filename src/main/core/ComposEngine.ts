import { EventEmitter } from 'node:events'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  CONF_FILE_NAME,
  MP3_SUFFIX,
  MP4_SUFFIX,
  OUTPUT_DIR_NAME,
  PLAYURL_FILE_NAME,
  VIDEO_INFO_FILE_NAME
} from '../config/constants'
import { CompositionOptions, EngineEventMap, VideoTaskInfo } from '../config/types'
import { createDirIfNotExist, isExist, isValidFile } from '../utils'
import ConfigManager from './ConfigManager'
import Engine from './Engine'
import logger from './Logger'

export class ComposEngine extends EventEmitter<EngineEventMap> {
  private configManager: ConfigManager

  constructor(configManager: ConfigManager) {
    super()
    this.configManager = configManager
    logger.info(this.constructor.name, 'inited')
  }

  /**
   * 执行主流程
   */
  public async run(): Promise<void> {
    try {
      const config = this.configManager.store.get('convert-config')
      const { gpacBinPath, outputDir, cachePath, forceTransform, forceComposition, genConfig } =
        config

      const errorMessage = await isValidFile(gpacBinPath, fs.constants.X_OK)

      if (errorMessage) {
        // 如果返回非空字符串，说明文件无效，直接使用返回的错误信息
        logger.error(errorMessage)
        throw new Error(errorMessage)
      }

      // 1. 生成BVS配置
      const bvs = await this.generateBVS(cachePath)

      // 写入 conf 文件
      if (genConfig) {
        // 确保输出目录存在
        await createDirIfNotExist(outputDir)
        const bvsBuffer = Buffer.from(JSON.stringify(bvs, null, 2), 'utf-8')
        const confFilePath = path.join(outputDir, CONF_FILE_NAME)
        await fs.writeFile(confFilePath, bvsBuffer)
        const message = `已写入 conf 文件: ${confFilePath}`
        logger.info(message)
      }

      // 2. 遍历处理
      for (let idx = 0, len = bvs.length; idx < len; idx++) {
        const bv = bvs[idx]

        if (bv.status !== 'completed') {
          const message = `未缓存完成,跳过合成: ${bv.fileInfo.fileName}`
          logger.warn(message)
          this.emit('progress', {
            type: 'preprocess',
            file: bv.fileInfo.fileName,
            raw: message
          })
          continue
        }

        const { videoM4sPath, videoMp4Path, audioM4sPath, audioMp3Path, fileName } = bv.fileInfo

        // 检查源文件
        const videoValidError = await isValidFile(videoM4sPath, fs.constants.R_OK)
        if (videoValidError) {
          const message = `${videoValidError}: ${videoM4sPath}, 跳过处理`
          logger.warn(message)
          this.emit('progress', {
            type: 'preprocess',
            file: fileName,
            raw: message
          })
          continue
        }

        const audioValidError = await isValidFile(audioM4sPath, fs.constants.R_OK)
        if (audioValidError) {
          const message = `${audioValidError}, 跳过: ${audioM4sPath}`
          logger.warn(message)
          this.emit('progress', {
            type: 'preprocess',
            file: fileName,
            raw: message
          })
          continue
        }

        // 3. 转换 (Transform)
        // 视频
        const isVideoExist = await isExist(videoMp4Path)
        if (!isVideoExist || forceTransform) {
          await this.transformFile(videoM4sPath, videoMp4Path)
          const message = `已转换视频${forceTransform ? '（覆盖）' : ''}: ${videoM4sPath} -> ${videoMp4Path}`
          logger.info(message)
          this.emit('progress', {
            type: 'preprocess',
            file: fileName,
            raw: message
          })
        } else {
          const message = `视频已存在,跳过转换: ${videoMp4Path}`
          logger.info(message)
          this.emit('progress', {
            type: 'preprocess',
            file: fileName,
            raw: message
          })
        }

        // 音频
        const isAudioExist = await isExist(audioMp3Path)
        if (!isAudioExist || forceTransform) {
          await this.transformFile(audioM4sPath, audioMp3Path)
          const message = `已转换音频${forceTransform ? '（覆盖）' : ''}: ${audioM4sPath} -> ${audioMp3Path}`
          logger.info(message)
          this.emit('progress', {
            type: 'preprocess',
            file: fileName,
            raw: message
          })
        } else {
          const message = `音频已存在,跳过转换: ${audioMp3Path}`
          logger.info(message)
          this.emit('progress', {
            type: 'preprocess',
            file: fileName,
            raw: message
          })
        }

        // 4. 合成 (Composition)
        const outputFilePath = path.join(outputDir, fileName)
        const isOutputExist = await isExist(outputFilePath)
        if (!isOutputExist || forceComposition) {
          await this.compose(gpacBinPath, {
            bvInfo: bv,
            videoFile: videoMp4Path,
            audioFile: audioMp3Path,
            outputFile: outputFilePath
          })
          const message = `已合成文件${forceComposition ? '（覆盖）' : ''}: ${outputFilePath}`
          logger.info(message)

          this.emit('progress', {
            type: 'preprocess',
            file: fileName,
            raw: message
          })
        } else {
          const message = `合成文件已存在,跳过: ${outputFilePath}`
          logger.info(message)

          this.emit('progress', {
            type: 'preprocess',
            file: fileName,
            raw: message
          })
        }

        // 5. 进度更新
        this.emit('itemProgress', {
          idx,
          len
        })
      }
    } catch (error) {
      logger.error(`合成失败: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  /**
   * 扫描缓存目录生成任务列表
   */
  private async generateBVS(cachePath: string): Promise<VideoTaskInfo[]> {
    try {
      const cacheDirs = await this.getCacheDirs(cachePath)
      const bvs: VideoTaskInfo[] = []
      for (const cacheDir of cacheDirs) {
        const videoTaskInfo = await this.getVideoTaskInfo(cacheDir)
        if (videoTaskInfo) {
          bvs.push(videoTaskInfo)
        }
      }
      return bvs
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
      logger.error(
        `获取缓存目录失败: ${cachePath}, 错误: ${error instanceof Error ? error.message : String(error)}`
      )
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
        `${this.filterFileName(videoTaskInfo.title)}-[${videoTaskInfo.uname}]` + MP4_SUFFIX

      return videoTaskInfo

      // 返回默认的视频和音频文件名
    } catch (error) {
      logger.error(`获取文件信息失败: ${error instanceof Error ? error.message : String(error)}`)
      return null
    }
  }

  /**
   * 过滤文件名中的特殊字符
   * @param name 原始文件名
   * @returns 过滤后的文件名
   */
  private filterFileName(name: string): string {
    if (!name) return ''

    return name
      .replace(/（/g, '(')
      .replace(/）/g, ')')
      .replace(/</g, '《')
      .replace(/>/g, '》')
      .replace(/\\/g, '#')
      .replace(/"/g, "'")
      .replace(/\//g, '#')
      .replace(/\|/g, '_')
      .replace(/\?/g, '？')
      .replace(/\*/g, '-')
      .replace(/【/g, '[')
      .replace(/】/g, ']')
      .replace(/:/g, '：')
      .replace(/\s+/g, '')
      .trim()
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
      logger.error(
        `转换文件失败: ${src} -> ${dst}, 错误: ${error instanceof Error ? error.message : String(error)}`
      )
      throw error
    } finally {
      if (srcFile) await srcFile.close()
      if (dstFile) await dstFile.close()
    }
  }

  /**
   * 调用 MP4Box 进行合成
   */
  private async compose(binPath: string, options: CompositionOptions): Promise<void> {
    const engine = new Engine(binPath, options)
    engine.on('progress', (progressData) => {
      this.emit('progress', progressData)
    })
    await engine.start()
  }
}
