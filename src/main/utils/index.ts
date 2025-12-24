import { app } from 'electron'
import is from 'electron-is'
import type { Stats } from 'fs'
import fs from 'fs/promises'
import path from 'path'
import { ENGINE_BIN_MAP } from '../config/constants'
import logger from '../core/Logger'

/**
 * 获取文件信息
 * @param path 文件路径
 * @returns 文件Stats信息
 */
export async function fileStats(path: string): Promise<Stats | null> {
  try {
    const stats = await fs.stat(path)
    return stats
  } catch (error) {
    logger.error(`未获取到文件信息: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

/**
 * 检查文件或目录是否存在
 * @param path 文件或目录路径
 * @returns 是否存在
 */
export async function isExist(path: string): Promise<boolean> {
  try {
    await fs.access(path, fs.constants.F_OK)
    return true
  } catch (error) {
    logger.error(`该文件不存在: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

/**
 * 创建目录（如果不存在）
 * @param path 目录路径
 */
export async function createDirIfNotExist(path: string): Promise<void> {
  try {
    const pathExist = await isExist(path)
    if (pathExist) {
      logger.info(`路径已存在: ${path}`)
    } else {
      await fs.mkdir(path, { recursive: true })
      logger.info(`目录创建成功: ${path}`)
    }
  } catch (error) {
    logger.error(`创建目录失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * 检查文件合法性
 * @param filePath 文件路径
 * @param mode 访问模式，默认为 fs.constants.F_OK
 * @returns 如果文件合法，返回空字符串；否则返回错误
 */
export async function isValidFile(
  filePath: string,
  mode: number = fs.constants.F_OK
): Promise<string> {
  try {
    await fs.access(filePath, mode)
    return ''
  } catch (error) {
    const message = `检查文件合法性失败: ${error instanceof Error ? error.message : String(error)}`
    logger.error(message)
    return message
  }
}

/**
 * 获取开发环境的 mp4box 可执行文件路径
 * @param platform 平台
 * @returns mp4box文件路径
 */
export function getDevEngineBinPath(platform: NodeJS.Platform): string {
  const base = path.resolve(__dirname, `../../extra/${platform}`)
  const bin = ENGINE_BIN_MAP[platform]
  const engineBinPath = path.join(base, bin)
  return engineBinPath
}

/**
 * 获取打包环境的的 mp4box 可执行文件路径
 * @returns mp4box文件路径
 */
export function getProdEngineBinPath(): string {
  return path.resolve(app.getAppPath(), '../')
}

/**
 * 获取默认的的 mp4box 可执行文件
 * @param platform 平台
 * @returns mp4box文件路径
 */
export function getEngineBinPath(platform: NodeJS.Platform): string {
  return is.dev() ? getDevEngineBinPath(platform) : getProdEngineBinPath()
}
