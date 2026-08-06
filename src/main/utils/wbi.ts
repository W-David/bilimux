import { createHash } from 'node:crypto'
import type HttpClient from '../core/HttpClient'

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41,
  13, 37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34,
  44, 52
]

type WbiKeys = {
  imgKey: string
  subKey: string
}

type WbiImgData = {
  wbi_img?: {
    img_url?: string
    sub_url?: string
  }
}

let cachedKeys: WbiKeys | null = null
let cachedAt = 0

function getMixinKey(imgKey: string, subKey: string): string {
  const raw = imgKey + subKey
  return MIXIN_KEY_ENC_TAB.map(index => raw[index]).join('')
}

function encodeParam(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
}

async function getWbiKeys(httpClient: HttpClient): Promise<WbiKeys> {
  if (cachedKeys && Date.now() - cachedAt < 3600_000) {
    return cachedKeys
  }

  const res = await httpClient.get('https://api.bilibili.com/x/web-interface/nav')
  const data = res.data as WbiImgData
  const imgUrl = data?.wbi_img?.img_url
  const subUrl = data?.wbi_img?.sub_url

  if (!imgUrl || !subUrl) {
    throw new Error('获取 Wbi 密钥失败')
  }

  const imgKey = imgUrl.split('/').pop()?.split('.')[0] ?? ''
  const subKey = subUrl.split('/').pop()?.split('.')[0] ?? ''
  if (!imgKey || !subKey) {
    throw new Error('解析 Wbi 密钥失败')
  }

  cachedKeys = { imgKey, subKey }
  cachedAt = Date.now()
  return cachedKeys
}

/**
 * 获取带 Wbi 签名的请求参数
 * @param httpClient HttpClient 实例
 * @param params 原始请求参数
 * @returns 追加了 wts 和 w_rid 的签名参数
 */
export async function getWbiSignedParams(
  httpClient: HttpClient,
  params: Record<string, string | number | undefined>
): Promise<Record<string, string>> {
  const { imgKey, subKey } = await getWbiKeys(httpClient)
  const mixinKey = getMixinKey(imgKey, subKey)

  const filtered: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      filtered[key] = String(value)
    }
  }

  filtered['wts'] = String(Math.floor(Date.now() / 1000))

  const query = Object.keys(filtered)
    .sort()
    .map(key => `${encodeParam(key)}=${encodeParam(filtered[key])}`)
    .join('&')

  const wRid = createHash('md5')
    .update(query + mixinKey)
    .digest('hex')

  return { ...filtered, w_rid: wRid }
}

/**
 * 清空缓存的 Wbi 密钥（退出登录时调用）
 */
export function resetWbiKeys(): void {
  cachedKeys = null
  cachedAt = 0
}
