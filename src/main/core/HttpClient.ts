import { DOMAIN, ERROR_CODE } from '@main/config/constants'
import { BiliResponseType } from '@shared/types'
import type { Got, OptionsOfJSONResponseBody, OptionsOfTextResponseBody, StreamOptions } from 'got'
import got from 'got'
import fs from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { CookieJar } from 'tough-cookie'
import UserAgent from 'user-agents'
import { resetWbiKeys } from '../utils/wbi'
import ConfigManager from './ConfigManager'
import logger from './Logger'

export interface HtmlResponseType {
  statusCode: number
  html: string
  redirectUrl: string
}

export type HttpGetHtml = (url: string, options?: OptionsOfTextResponseBody) => Promise<HtmlResponseType>
export type HttpGetJson = (url: string, options?: OptionsOfJSONResponseBody) => Promise<BiliResponseType>
export type HttpPostJson = (url: string, options?: OptionsOfJSONResponseBody) => Promise<BiliResponseType>
export type HttpPostStream = (url: string, options?: StreamOptions) => Promise<unknown>

export type DownloadFileResponseInfo = {
  statusCode: number
  totalSize: number
  contentLength: number
  headers: Record<string, unknown>
}

export type DownloadFileOptions = {
  /** 已下载字节数，>0 时发送 Range 请求并从文件末尾追加 */
  offset?: number
  /** 用于暂停/取消下载 */
  signal?: AbortSignal
  /** 响应头就绪时回调，可用于记录总大小 */
  onResponse?: (info: DownloadFileResponseInfo) => void
  /** 校验响应是否可继续，返回错误信息时中断本次下载 */
  validateResponse?: (info: DownloadFileResponseInfo) => string | undefined
}

export default class HttpClient {
  cookieJar: CookieJar
  userAgent: UserAgent
  configManager: ConfigManager
  client: Got

  constructor(configManager: ConfigManager) {
    this.userAgent = new UserAgent({ deviceCategory: 'desktop' })
    this.configManager = configManager
    this.cookieJar = this.loadCookieJar()
    this.client = this.initGot()
  }

  private initGot(): Got {
    if (this.client) {
      return this.client
    }

    // 初始化实例并注入拦截器
    const client = got.extend({
      cookieJar: this.cookieJar,
      headers: {
        'User-Agent': this.userAgent.toString(),
        Referer: DOMAIN
      },
      hooks: {
        afterResponse: [
          response => {
            if (response.statusCode >= 200 && response.statusCode < 300) {
              // 只要响应成功就把当前 cookie jar 持久化，避免登录 Cookie 丢失
              this.saveCookieJar()
            }
            if (response.request.options.responseType === 'json' && (response.body as BiliResponseType).code !== 0) {
              const { code, message } = response.body as BiliResponseType
              const msg = message ? message : ERROR_CODE[code]
              logger.error(`[Request Error] ${code}: ${msg}`)
            }
            return response
          }
        ],
        beforeError: [
          error => {
            const { response } = error
            logger.error(`[Error] ${response?.statusCode} ${error.message}`, {
              url: response?.url,
              body: response?.body
            })
            return error
          }
        ]
      }
    })

    return client
  }

  private loadCookieJar() {
    const cookieStr = this.configManager.store.get('user-cookie')
    if (cookieStr) {
      const jar = CookieJar.deserializeSync(JSON.parse(cookieStr))
      return jar
    }
    return new CookieJar()
  }

  public saveCookieJar() {
    const cookie = this.cookieJar.serializeSync()
    if (!cookie) {
      logger.warn('[Cookie] saveCookieJar: cookieJar 序列化失败，跳过写入')
      return
    }
    this.configManager.store.set('user-cookie', JSON.stringify(cookie))
  }

  async getCookieKey(key: string) {
    // 从整个 jar 中按 key 查找，避免 host-only cookie 因域名不匹配而查不到
    const cookies = await this.cookieJar.store.getAllCookies()
    return cookies.find(cookie => cookie.key === key)
  }

  /**
   * 退出登录：尽力通知 B 站服务端注销，然后清空内存与本地持久化的登录 Cookie
   */
  async logout(): Promise<void> {
    try {
      const biliJct = await this.getCookieKey('bili_jct')
      if (biliJct?.value) {
        await this.client('https://passport.bilibili.com/login/exit/v2', {
          method: 'POST',
          responseType: 'json',
          form: {
            biliCSRF: biliJct.value,
            gourl: DOMAIN
          }
        })
      }
    } catch (error) {
      logger.warn('[Logout] 通知 B 站服务端退出登录失败，继续清理本地登录态', error)
    }

    // 清空内存中的 Cookie（保持同一个 CookieJar 实例，避免已创建的 got 客户端失效）
    this.cookieJar.removeAllCookiesSync()
    // 清空持久化的登录信息
    this.configManager.store.set('user-cookie', '')
    // 清空基于账号信息缓存的 Wbi 密钥
    resetWbiKeys()
    logger.info('[Logout] 本地登录信息已清空')
  }

  /**
   * 获取Html页面
   * @param url 请求地址
   * @param options 请求选项
   */
  public getHtml: HttpGetHtml = async (url, options) => {
    try {
      const response = await this.client(url, { ...options, method: 'GET' })
      return {
        statusCode: response.statusCode,
        html: response.body,
        redirectUrl:
          response.redirectUrls && response.redirectUrls.length > 0 ? response.redirectUrls[0].toString() : ''
      }
    } catch (error) {
      logger.error(`[GET HTML]: ${url}`, error)
      throw error
    }
  }

  /**
   * 发送 GET 请求
   * @param url 请求地址
   * @param options 请求选项
   */
  public get: HttpGetJson = async (url, options) => {
    try {
      const response = await this.client<BiliResponseType>(url, { ...options, responseType: 'json', method: 'GET' })
      return response.body
    } catch (error) {
      logger.error(`[GET]: ${url}`, error)
      throw error
    }
  }

  /**
   * 发送 POST 请求
   * @param url 请求地址
   * @param options 请求选项
   */
  public post: HttpPostJson = async (url, options) => {
    try {
      const response = await this.client<BiliResponseType>(url, { ...options, responseType: 'json', method: 'POST' })
      return response.body
    } catch (error) {
      logger.error(`[POST]: ${url}`, error)
      throw error
    }
  }

  /**
   * 下载文件流
   * @param url 下载地址
   * @param options 请求选项
   */
  public stream: HttpPostStream = async (url, options) => {
    try {
      return this.client.stream(url, { ...options, method: 'POST', isStream: true })
    } catch (error) {
      logger.error(`[POST Stream]: ${url}`, error)
      throw error
    }
  }

  /**
   * 下载文件到本地
   * @param url 文件地址
   * @param destPath 目标路径
   * @param onProgress 下载进度回调 (百分比 0-100, 已接收字节, 总字节)
   * @param options 断点续传相关选项
   */
  public downloadFile = async (
    url: string,
    destPath: string,
    onProgress?: (percent: number, received: number, total: number) => void,
    options?: DownloadFileOptions
  ): Promise<void> => {
    const offset = options?.offset ?? 0
    const headers: Record<string, string> = {
      Referer: DOMAIN
    }
    if (offset > 0) {
      headers.Range = `bytes=${offset}-`
    }

    const downloadStream = this.client.stream(url, {
      method: 'GET',
      isStream: true,
      headers,
      signal: options?.signal,
      retry: { limit: 0 }
    })

    let total = 0
    let received = 0

    downloadStream.on('response', response => {
      const contentLength = Number(response.headers['content-length'] || 0)
      const contentRange = response.headers['content-range']
      const rangeMatch = typeof contentRange === 'string' ? /^bytes \d+-\d+\/(\d+|\*)$/.exec(contentRange) : null
      const totalSize = rangeMatch && rangeMatch[1] !== '*' ? Number(rangeMatch[1]) : contentLength + offset

      // 请求了 Range 却返回 200：服务器不支持断点续传，必须从头下载
      if (offset > 0 && response.statusCode === 200) {
        const error = new Error('服务器不支持 Range，需要从头下载')
        ;(error as NodeJS.ErrnoException).code = 'RANGE_NOT_SUPPORTED'
        downloadStream.destroy(error)
        return
      }

      const invalidMessage = options?.validateResponse?.({
        statusCode: response.statusCode,
        totalSize,
        contentLength,
        headers: response.headers
      })
      if (invalidMessage) {
        const error = new Error(invalidMessage)
        ;(error as NodeJS.ErrnoException).code = 'RESUME_MISMATCH'
        downloadStream.destroy(error)
        return
      }

      total = totalSize
      options?.onResponse?.({
        statusCode: response.statusCode,
        totalSize,
        contentLength,
        headers: response.headers
      })
    })

    downloadStream.on('data', chunk => {
      received += chunk.length
      if (total > 0) {
        onProgress?.(Math.min(100, Math.round(((offset + received) / total) * 100)), offset + received, total)
      }
    })

    await pipeline(downloadStream, fs.createWriteStream(destPath, { flags: offset > 0 ? 'a' : 'w' }))
  }
}
