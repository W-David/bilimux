import type { Got, GotStream, Options } from 'got'
import got from 'got'
import { CookieJar } from 'tough-cookie'
import UserAgent from 'user-agents'
import ConfigManager from './ConfigManager'
import logger from './Logger'

export type BiliResponseType<T = unknown> = {
  ttl: number
  data?: T
  code: number
  message: string
}

export default class HttpClient<R extends BiliResponseType = BiliResponseType> {
  static instance: HttpClient
  cookieJar: CookieJar
  userAgent: UserAgent
  configManger: ConfigManager
  client: Got

  constructor(configManager: ConfigManager) {
    this.configManger = configManager
    this.cookieJar = new CookieJar()
    this.userAgent = new UserAgent({ deviceCategory: 'desktop' })
    this.client = this.initGot()
    logger.info(this.constructor.name, 'inited')
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
        Referer: 'https://www.bilibili.com/client'
      },
      hooks: {
        beforeRequest: [
          options => {
            logger.debug(`[Request] ${options.method}: ${options.url}`)
          }
        ],
        afterResponse: [
          response => {
            logger.debug(`[Response] ${response.method}: ${response.url}`)
            return response
          }
        ],
        beforeRedirect: [
          (options, response) => {
            logger.debug(`[Redirect] ${response.method}: ${response.url} -> ${options.url}`)
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

  /**
   * 发送 GET 请求
   * @param url 请求地址
   * @param options 请求选项
   */
  async get(url: string, options?: Options): Promise<R> {
    try {
      const response = await this.client(url, { ...options, method: 'GET' }).json<R>()
      return response
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
  async post(url: string, options?: Options): Promise<R> {
    try {
      const response = await this.client(url, { ...options, method: 'POST' }).json<R>()
      return response
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
  stream(url: string, options?: Options): ReturnType<GotStream> {
    return this.client.stream(url, { ...options, isStream: true })
  }
}
