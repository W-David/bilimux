import { getCurrentUserInfo } from '@renderer/api/network'
import type { UserInfo } from '@shared/types'

/**
 * 单独获取当前登录用户信息
 */
export async function fetchCurrentUserInfo(): Promise<UserInfo> {
  const navRes = await getCurrentUserInfo()
  if (!navRes.data?.mid) {
    throw new Error('获取用户信息失败，请重新登录')
  }
  return navRes.data
}
