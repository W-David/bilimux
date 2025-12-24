import { ChildProcess, spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import path from 'node:path'
import { CompositionOptions, EngineEventMap, EngineResponse } from '../config/types'
import logger from './Logger'

export default class Engine extends EventEmitter<EngineEventMap> {
  static instance: ChildProcess | null
  #engineBinPath: string
  #options: CompositionOptions

  constructor(engineBinPath: string, options: CompositionOptions) {
    super()
    this.#engineBinPath = engineBinPath
    this.#options = options

    logger.info(this.constructor.name, 'inited')
  }

  async start(): Promise<EngineResponse | void> {
    if (Engine.instance) {
      return
    }

    const args = this.getStartArgs()

    return new Promise((resolve, reject) => {
      try {
        logger.info(`开始合成视频: ${path.basename(this.#options.outputFile)}`)
        Engine.instance = spawn(this.#engineBinPath, args, {
          windowsHide: true,
          stdio: 'pipe'
        })
        if (!Engine.instance) {
          throw new Error('无效的进程')
        }

        Engine.instance.once('close', (code, signal) => {
          if (code === 0) {
            logger.info(`文件合成完毕: ${path.basename(this.#options.outputFile)}`)
            resolve({ success: true, code })
          } else {
            reject(new Error(`程序异常退出: ${signal}`))
          }
          Engine.instance = null
        })
        Engine.instance.on('error', (error) => {
          reject(error)
          Engine.instance = null
        })

        Engine.instance.stdout?.on('data', (data: Buffer) => this.parseProgress(data))
        Engine.instance.stderr?.on('data', (data: Buffer) => this.parseProgress(data))
      } catch (error) {
        logger.error(`MP4Box 启动失败: ${error instanceof Error ? error.message : String(error)}`)
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
      } as Record<string, string>

      // 使用策略模式确定进度类型
      const matchedKeyword = Object.keys(progressTypeStrategies).find((keyword) =>
        output.includes(keyword)
      )
      const type = matchedKeyword ? progressTypeStrategies[matchedKeyword] : 'unknown'

      this.emit('progress', {
        type,
        progress,
        file: path.basename(this.#options.outputFile),
        raw: output.trim()
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
      logger.error(`关闭 GPAC 出错: ${(error as Error).message}`)
      return true
    }
  }
  stop(): void {
    logger.info(`关闭 GPAC ...`)
    if (Engine.instance) {
      Engine.instance.kill()
      Engine.instance = null
    }
  }
  restart(): void {
    this.stop()
    this.start()
  }
}
