import { app } from 'electron'
import is from 'electron-is'
import fs from 'fs/promises'
import path from 'path'
import { ENGINE_BIN_MAP } from '../config/constants'
import logger from '../core/Logger'

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
    logger.debug(`该文件不存在: ${path}`)
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
      logger.debug(`路径已存在: ${path}`)
    } else {
      await fs.mkdir(path, { recursive: true })
      logger.debug(`目录创建成功: ${path}`)
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
export async function isValidFile(filePath: string, mode: number = fs.constants.F_OK): Promise<string> {
  try {
    await fs.access(filePath, mode)
    return ''
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const errorCode = error instanceof Error && 'code' in error ? (error as NodeJS.ErrnoException).code : undefined
    const codeMap: Record<string, string> = {
      ENOENT: '文件或目录不存在',
      EACCES: '权限被拒绝',
      EPERM: '操作不被允许',
      ENOTDIR: '路径不是目录',
      EISDIR: '路径是目录',
      ELOOP: '符号链接嵌套过深',
      ENAMETOOLONG: '文件名过长'
    }
    let userMessage = `文件验证失败: ${errorMsg}`
    if (errorCode && codeMap[errorCode]) {
      userMessage = `文件验证失败: ${codeMap[errorCode]}`
    }
    const fullMessage = `[${filePath}] ${userMessage}`
    logger.error(fullMessage)
    return fullMessage
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
 * @param platform 平台
 * @returns mp4box文件路径
 */
export function getProdEngineBinPath(platform: NodeJS.Platform): string {
  const bin = ENGINE_BIN_MAP[platform]
  return path.resolve(app.getAppPath(), '../', bin)
}

/**
 * 获取默认的的 mp4box 可执行文件
 * @param platform 平台
 * @returns mp4box文件路径
 */
export function getEngineBinPath(platform: NodeJS.Platform): string {
  return is.dev() ? getDevEngineBinPath(platform) : getProdEngineBinPath(platform)
}

/**
 * 过滤文件名中的特殊字符，保证跨平台可用（转换与下载共用）
 * @param name 原始标题
 * @returns 清洗后的文件名
 */
export function sanitizeFileName(name: string): string {
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
 * 批量检查文件是否存在（限制并发，避免一次性打开过多句柄）
 * @param paths 文件路径列表
 * @returns 路径 -> 是否存在
 */
export async function checkFilesExist(paths: string[]): Promise<Map<string, boolean>> {
  const uniquePaths = [...new Set(paths.filter(Boolean))]
  const result = new Map<string, boolean>()
  let index = 0

  const worker = async (): Promise<void> => {
    while (index < uniquePaths.length) {
      const filePath = uniquePaths[index++]
      try {
        await fs.stat(filePath)
        result.set(filePath, true)
      } catch {
        result.set(filePath, false)
      }
    }
  }

  const workerCount = Math.min(16, uniquePaths.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return result
}

/**
 * 固定并发执行异步映射，保持结果顺序与入参一致
 * @param items 待处理列表
 * @param limit 并发上限
 * @param fn 异步处理函数
 */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0

  const worker = async (): Promise<void> => {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await fn(items[index], index)
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length))
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return results
}
