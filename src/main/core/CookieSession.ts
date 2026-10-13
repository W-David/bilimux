import { parseRefreshCsrf } from '@shared/cookie-refresh'
import { getCorrespondPath } from '../utils/correspond-path'
import { app } from 'electron/main'
import fs from 'node:fs/promises'
import path from 'node:path'
import HttpClient from './HttpClient'
import logger from './Logger'

const TOKEN_FILE = 'refresh-token'
const COOKIE_INFO_URL = 'https://passport.bilibili.com/x/passport-login/web/cookie/info'
const COOKIE_REFRESH_URL = 'https://passport.bilibili.com/x/passport-login/web/cookie/refresh'
const CONFIRM_REFRESH_URL = 'https://passport.bilibili.com/x/passport-login/web/confirm/refresh'
const CORRESPOND_URL = 'https://www.bilibili.com/correspond/1/'

export type AuthEnsureResult = {
  ok: boolean
  message?: string
}

type CookieInfoData = {
  refresh?: boolean
  timestamp?: number
}

type CookieRefreshData = {
  refresh_token?: string
}

export default class CookieSession {
  private httpClient: HttpClient

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient
  }

  private tokenPath(): string {
    return path.join(app.getPath('userData'), TOKEN_FILE)
  }

  public async saveRefreshToken(token: string | undefined): Promise<void> {
    if (!token) return
    await fs.writeFile(this.tokenPath(), token, { encoding: 'utf8', mode: 0o600 })
    await fs.chmod(this.tokenPath(), 0o600)
  }

  public async readRefreshToken(): Promise<string | null> {
    try {
      const text = await fs.readFile(this.tokenPath(), 'utf8')
      const token = text.trim()
      return token || null
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      logger.warn('[Auth] 读取 refresh_token 失败', error)
      return null
    }
  }

  public async clearRefreshToken(): Promise<void> {
    await fs.rm(this.tokenPath(), { force: true })
  }

  public async ensure(): Promise<AuthEnsureResult> {
    try {
      const sessdata = await this.httpClient.getCookieKey('SESSDATA')
      const biliJct = await this.httpClient.getCookieKey('bili_jct')
      if (!sessdata?.value || !biliJct?.value) {
        return { ok: false, message: '登录状态已失效，请重新扫码登录' }
      }

      const info = await this.httpClient.get(COOKIE_INFO_URL, {
        searchParams: { csrf: biliJct.value }
      })
      const infoData = (info.data ?? null) as CookieInfoData | null
      if (info.code !== 0 || !infoData) {
        return { ok: false, message: '登录状态已失效，请重新扫码登录' }
      }
      if (!infoData.refresh) {
        return { ok: true }
      }

      const refreshToken = await this.readRefreshToken()
      if (!refreshToken) {
        return { ok: false, message: '登录状态已过期，请重新扫码登录' }
      }

      const timestamp = typeof infoData.timestamp === 'number' ? infoData.timestamp : Date.now()
      const html = await this.httpClient.getText(`${CORRESPOND_URL}${getCorrespondPath(timestamp)}`)
      const refreshCsrf = parseRefreshCsrf(html)
      if (!refreshCsrf) {
        return { ok: false, message: '登录状态已过期，请重新扫码登录' }
      }

      const refreshed = await this.httpClient.postForm<CookieRefreshData>(COOKIE_REFRESH_URL, {
        csrf: biliJct.value,
        refresh_csrf: refreshCsrf,
        source: 'main_web',
        refresh_token: refreshToken
      })
      if (refreshed.code !== 0 || !refreshed.data?.refresh_token) {
        logger.warn(`[Auth] Cookie 刷新失败: ${refreshed.code} ${refreshed.message}`)
        return { ok: false, message: '登录状态已过期，请重新扫码登录' }
      }

      const nextJct = await this.httpClient.getCookieKey('bili_jct')
      if (nextJct?.value) {
        const confirm = await this.httpClient.postForm(CONFIRM_REFRESH_URL, {
          csrf: nextJct.value,
          refresh_token: refreshToken
        })
        if (confirm.code !== 0) {
          logger.warn(`[Auth] 确认 Cookie 刷新失败: ${confirm.code} ${confirm.message}`)
        }
      }

      await this.saveRefreshToken(refreshed.data.refresh_token)
      await this.httpClient.saveCookieJar()
      logger.info('[Auth] Cookie 已刷新')
      return { ok: true }
    } catch (error) {
      logger.error('[Auth] 登录态检查失败', error)
      return { ok: false, message: '登录状态检查失败，请重新扫码登录' }
    }
  }
}
