const ALLOWED_HOSTS = new Set(['bilibili.com', 'bilivideo.com'])

function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (ALLOWED_HOSTS.has(host)) return true
  return [...ALLOWED_HOSTS].some(suffix => host.endsWith(`.${suffix}`))
}

export function assertAllowedHttpUrl(url: string): URL {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('无效的请求地址')
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('只允许 HTTPS 请求')
  }
  if (!isAllowedHost(parsed.hostname)) {
    throw new Error('不允许的请求地址')
  }
  return parsed
}
