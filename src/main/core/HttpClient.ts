import { DOMAIN, ERROR_CODE } from '@main/config/constants'
import { BiliResponseType } from '@shared/types'
import type { Got, OptionsOfJSONResponseBody, OptionsOfTextResponseBody, StreamOptions } from 'got'
import got from 'got'
import { CookieJar } from 'tough-cookie'
import UserAgent from 'user-agents'
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
        Referer: DOMAIN
      },
      hooks: {
        beforeRequest: [
          options => {
            logger.debug(`[Request    Urls]: ${options.url}`)
            logger.debug(`[Request Headers]: ${JSON.stringify(options.headers, null, 2)}`)
          }
        ],
        afterResponse: [
          response => {
            logger.debug(`[Response     Url]: ${response.url}`)
            logger.debug(`[Response Headers]: ${JSON.stringify(response.headers, null, 2)}`)
            logger.debug(`[Response    Body]: ${JSON.stringify(response.body, null, 2)}`)
            if (response.statusCode === 200 && response.headers['set-cookie']) {
              logger.debug(`[Update Cookie] ${response.headers['set-cookie'].join(', ')}`)
              this.saveCookieJar()
            }
            if (response.request.options.responseType === 'json' && (response.body as BiliResponseType).code !== 0) {
              const { code, message } = response.body as BiliResponseType
              const msg = message ? message : ERROR_CODE[code]
              logger.error(`[Request  Coce]: ${code}`)
              logger.error(`[Request Error]: ${msg}`)
            }
            return response
          }
        ],
        beforeRedirect: [
          (options, response) => {
            logger.debug(`[Redirect]: ${response.url} -> ${options.url}`)
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
      return CookieJar.deserializeSync(JSON.parse(cookieStr))
    }
    return new CookieJar()
  }

  private saveCookieJar() {
    const cookie = this.cookieJar.serializeSync()
    this.configManager.store.set('user-cookie', JSON.stringify(cookie))
  }

  async getCookieKey(key: string) {
    const cookies = await this.cookieJar.getCookies(DOMAIN)
    const cookieObj = cookies.find(cookie => cookie.key === key)
    return cookieObj
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
}
