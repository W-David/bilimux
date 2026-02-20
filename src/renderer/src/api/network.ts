import { emitter } from '@renderer/ipc'
import { RendererEmitterInvokeFn } from '@shared/ipc/events'
import { BiliResponseType } from '@shared/types'
import { OptionsOfJSONResponseBody } from 'got'
import { Nullable } from 'tough-cookie'

type PromiseResponseType<T> = Promise<BiliResponseType<T>>

/**
 * 发送 HTTP GET 请求
 */
const httpGet: RendererEmitterInvokeFn<'http-get'> = (url, options) => {
  return emitter.invoke('http-get', url, options)
}

/**
 * 解析 HTML URL 页面，获取视频元数据
 */
const httpGetVideoMetaData: RendererEmitterInvokeFn<'http-get-video-metadata'> = url => {
  return emitter.invoke('http-get-video-metadata', url)
}

/**
 * 发送 HTTP POST 请求
 */
// const httpPost: RendererEmitterInvokeFn<'http-post'> = (url, options?) => {
//   return emitter.invoke('http-post', url, options)
// }

// 二维码返回数据类型
export interface QrCodeResponseData {
  url: string
  qrcode_key: string
}

// 检查登录状态返回数据类型
export interface CheckLoginStatusResponseData {
  code: number
  message: string
}

// Cookie 登录返回数据类型
export interface CookieLoginResponseData {
  isLogin: boolean
  mid?: number
  uname?: string
}

// 检查认证状态返回数据类型
export interface CheckAuthStatusResponseData {
  refresh: boolean
  timestamp: number
}

/**
 * 获取登录二维码
 */
export const getQrCode = (options?: OptionsOfJSONResponseBody) => {
  return httpGet(
    'https://passport.bilibili.com/x/passport-login/web/qrcode/generate',
    options
  ) as PromiseResponseType<QrCodeResponseData>
}

/**
 * 轮询检查二维码登录状态
 */
export const checkQrCodeLoginStatus = (options?: OptionsOfJSONResponseBody) => {
  return httpGet('https://passport.bilibili.com/x/passport-login/web/qrcode/poll', {
    ...options,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }) as PromiseResponseType<CheckLoginStatusResponseData>
}

/**
 * 尝试获取用户数据，检查用户登录状态（通过 Cookie）
 */
export const checkLoginStatus = () => {
  return httpGet('https://api.bilibili.com/x/web-interface/nav') as PromiseResponseType<CookieLoginResponseData>
}

/**
 * 检查用户认证状态以及是否需要刷新 (刷新 Cookie)
 */
export const checkAuthStatus = (options?: OptionsOfJSONResponseBody) => {
  return httpGet(
    'https://passport.bilibili.com/x/passport-login/web/cookie/info',
    options
  ) as PromiseResponseType<CheckAuthStatusResponseData>
}

/**
 * 获取视频元数据
 */
export const getVideoMetaData = (url: string) => {
  return httpGetVideoMetaData(url) as Promise<[Nullable<string[]>, Nullable<string>]>
}
