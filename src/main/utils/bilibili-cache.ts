import { app } from 'electron/main'
import fs from 'node:fs'
import path from 'node:path'
import { OUTPUT_DIR_NAME } from '../config/constants'

function looksLikeCacheRoot(dir: string): boolean {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    return entries.some(entry => entry.isDirectory() && entry.name !== OUTPUT_DIR_NAME)
  } catch {
    return false
  }
}

/**
 * 默认缓存目录不存在时，探测本机常见 B 站客户端缓存路径
 */
export function probeBilibiliCachePath(fallback: string): string {
  if (looksLikeCacheRoot(fallback)) return fallback

  const videos = app.getPath('videos')
  const home = app.getPath('home')
  const candidates = [
    path.join(videos, 'bilibili'),
    path.join(videos, '哔哩哔哩'),
    path.join(home, 'Movies', 'bilibili'),
    path.join(home, 'Movies', '哔哩哔哩'),
    path.join(home, 'Documents', 'bilibili')
  ]

  const seen = new Set<string>()
  for (const candidate of candidates) {
    const normalized = path.normalize(candidate)
    if (seen.has(normalized) || normalized === path.normalize(fallback)) continue
    seen.add(normalized)
    if (looksLikeCacheRoot(normalized)) return normalized
  }

  return fallback
}
