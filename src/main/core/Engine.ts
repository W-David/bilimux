import { ChildProcess, spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import path from 'node:path'
import { CompositionOptions, EngineEventMap, EngineResponse } from '../config/types'
import logger from './Logger'

export default class Engine extends EventEmitter<EngineEventMap> {
  #instance: ChildProcess | null
  #engineBinPath: string
  #options: CompositionOptions

  constructor(engineBinPath: string, options: CompositionOptions) {
    super()
    this.#instance = null
    this.#engineBinPath = engineBinPath
    this.#options = options
  }

  async start(): Promise<EngineResponse> {
    if (this.#instance) {
      logger.warn('Engine instance already exists, killing previous instance')
      try {
        this.stop()
      } catch (error) {
        logger.error(`Failed to stop previous instance: ${error}`)
      }
    }

    const args = this.getStartArgs()

    return new Promise((resolve, reject) => {
      try {
        logger.info(`开始合成视频: ${path.basename(this.#options.outputFile)}`)
        this.#instance = spawn(this.#engineBinPath, args, {
          windowsHide: true,
          stdio: 'pipe'
        })
        if (!this.#instance) {
          throw new Error('无效的Mp4Box进程')
        }

        this.#instance.once('close', (code, signal) => {
          if (code === 0) {
            logger.info(`文件合成完毕: ${path.basename(this.#options.outputFile)}`)
            resolve({ success: true, code })
          } else {
            reject(new Error(`Mp4Box程序异常退出: ${signal} (Code: ${code})`))
          }
          this.stop()
        })
        this.#instance.on('error', error => {
          reject(error)
          this.stop()
        })

        this.#instance.stdout?.on('data', (data: Buffer) => this.parseProgress(data))
        this.#instance.stderr?.on('data', (data: Buffer) => this.parseProgress(data))
      } catch (error) {
        logger.error(`Mp4Box进程启动失败: ${error instanceof Error ? error.message : String(error)}`)
        reject(error)
      }
    })
  }

  /**
   * 解析MP4Box输出，提取进度信息
   * @param data MP4Box输出数据
   */
  parseProgress(data: Buffer): void {
    const output = data.toString()
    // 解析MP4Box进度输出格式："Importing ISO File: |                    | (XX/100)"
    // 或者                  "ISO File Writing: |                    | (XX/100)"

    const progressMatch = output.match(/\((\d+)\/100\)/)
    if (progressMatch && progressMatch[1]) {
      const progress = parseInt(progressMatch[1], 10)

      // 策略映射：关键字到类型的映射
      const progressTypeStrategies = {
        Importing: 'importing',
        Writing: 'writing'
      }

      // 使用策略模式确定进度类型
      const matchedKeyword = Object.keys(progressTypeStrategies).find(keyword => output.includes(keyword))
      const type = matchedKeyword ? progressTypeStrategies[matchedKeyword] : 'preprocess'

      this.emit('process:item:progress', {
        bvid: this.#options.bvInfo.bvid,
        type,
        progress
      })
    }
  }

  getStartArgs(): string[] {
    const { videoFile, audioFile, outputFile } = this.#options
    const videoParams = ['-add', `${videoFile}#video`]
    const audioParams = ['-add', `${audioFile}#audio`]
    const outputParams = ['-new', outputFile]
    return [...videoParams, ...audioParams, ...outputParams]
  }

  isRunning(pid: number): boolean {
    try {
      return process.kill(pid, 0)
    } catch (error) {
      logger.error(`关闭Mp4Box进程出错: ${(error as Error).message}`)
      return true
    }
  }

  stop(): void {
    if (this.#instance) {
      logger.info(`关闭Mp4Box进程, PID: ${this.#instance.pid}`)
      this.#instance.kill()
      this.#instance = null
    }
  }

  restart(): void {
    this.stop()
    this.start()
  }
}
