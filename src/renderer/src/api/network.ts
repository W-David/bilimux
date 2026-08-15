import { emitter } from '@renderer/ipc'
import { BiliHttpGetOptions, RendererEmitterInvokeFn } from '@shared/ipc/events'
import { BiliResponseType, FavoriteFolder, FavoriteResource, UserInfo } from '@shared/types'
import { Nullable } from 'tough-cookie'

type PromiseResponseType<T> = Promise<BiliResponseType<T>>

/**
 * 发送 HTTP GET 请求
 */
const httpGet: RendererEmitterInvokeFn<'http-get'> = (url, options) => {
  return emitter.invoke('http-get', url, options)
}

type HttpGetOptions = BiliHttpGetOptions

/**
 * 解析 HTML URL 页面，获取视频元数据
 */
const httpGetVideoMetaData: RendererEmitterInvokeFn<'http-get-video-metadata'> = url => {
  return emitter.invoke('http-get-video-metadata', url)
}

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

// 检查认证状态返回数据类型
export interface CheckAuthStatusResponseData {
  refresh: boolean
  timestamp: number
}

/**
 * 获取登录二维码
 */
export const getQrCode = (options?: HttpGetOptions) => {
  return httpGet(
    'https://passport.bilibili.com/x/passport-login/web/qrcode/generate',
    options
  ) as PromiseResponseType<QrCodeResponseData>
}

/**
 * 轮询检查二维码登录状态
 */
export const checkQrCodeLoginStatus = (options?: HttpGetOptions) => {
  return httpGet('https://passport.bilibili.com/x/passport-login/web/qrcode/poll', {
    ...options,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }) as PromiseResponseType<CheckLoginStatusResponseData>
}

/**
 * 检查用户认证状态以及是否需要刷新 (刷新 Cookie)
 */
export const checkAuthStatus = (options?: HttpGetOptions) => {
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

/**
 * 获取当前登录用户信息
 */
export const getCurrentUserInfo = () => {
  return httpGet('https://api.bilibili.com/x/web-interface/nav') as PromiseResponseType<UserInfo>
}

/**
 * 获取用户创建的收藏夹列表
 */
export const getFavoriteFolders = (upMid: number) => {
  return httpGet('https://api.bilibili.com/x/v3/fav/folder/created/list-all', {
    searchParams: { up_mid: upMid }
  }) as PromiseResponseType<{ count: number; list: FavoriteFolder[] | null }>
}

/**
 * 获取收藏夹详细信息（创建时间、简介等）
 */
export const getFavoriteFolderInfo = (mediaId: number) => {
  return httpGet('https://api.bilibili.com/x/v3/fav/folder/info', {
    searchParams: { media_id: mediaId }
  }) as PromiseResponseType<FavoriteFolder>
}

/**
 * 获取收藏夹内的视频列表
 */
export const getFavoriteResources = (mediaId: number, pn = 1, ps = 20) => {
  return httpGet('https://api.bilibili.com/x/v3/fav/resource/list', {
    searchParams: { media_id: mediaId, pn, ps, platform: 'web' }
  }) as PromiseResponseType<{ info: FavoriteFolder; medias: FavoriteResource[]; has_more: boolean }>
}

export type VideoPageListItem = {
  cid: number
  page: number
  part: string
  duration: number
}

/**
 * 用 bvid 换分 P 列表（cid / 序号 / 标题）
 */
export const getVideoPageList = (bvid: string) => {
  return httpGet('https://api.bilibili.com/x/player/pagelist', {
    searchParams: { bvid }
  }) as PromiseResponseType<VideoPageListItem[]>
}
