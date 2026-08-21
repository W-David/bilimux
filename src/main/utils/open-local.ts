import { shell } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import { assertAllowedPath } from './allowed-path'

const MEDIA_EXT = new Set(['.mp4', '.m4v', '.mkv', '.webm', '.mov'])

function mapShellError(raw: string, kind: 'file' | 'folder'): string {
  const text = raw.toLowerCase()
  if (text.includes('not exist') || text.includes('enoent') || text.includes('no such')) {
    return kind === 'folder' ? '找不到这个文件夹，可能已被删除或移动' : '文件不存在或已被删除'
  }
  if (text.includes('denied') || text.includes('eacces') || text.includes('eperm') || text.includes('permission')) {
    return kind === 'folder' ? '没有权限打开这个文件夹' : '没有权限打开这个文件'
  }
  if (text.includes('no application') || text.includes('there is no application')) {
    return '没有可用的播放器来打开这个文件，请安装视频播放器后重试'
  }
  if (text.includes('corrupt') || text.includes('damaged') || text.includes('invalid')) {
    return '文件可能已损坏，无法播放'
  }
  return kind === 'folder' ? '无法打开这个文件夹' : '无法打开这个文件，可能已被删除或损坏'
}

function mapNodeError(error: unknown, kind: 'file' | 'folder'): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
  if (code === 'ENOENT') return kind === 'folder' ? '找不到这个文件夹，可能已被删除或移动' : '文件不存在或已被删除'
  if (code === 'EACCES' || code === 'EPERM') {
    return kind === 'folder' ? '没有权限打开这个文件夹' : '没有权限打开这个文件'
  }
  const message = error instanceof Error ? error.message : String(error)
  return mapShellError(message, kind)
}

async function looksLikeBrokenMedia(filePath: string, size: number): Promise<boolean> {
  if (size <= 0) return true
  const ext = path.extname(filePath).toLowerCase()
  if (!MEDIA_EXT.has(ext)) return false
  if (size < 1024) return true
  try {
    const handle = await fs.open(filePath, 'r')
    try {
      const buf = Buffer.alloc(12)
      const { bytesRead } = await handle.read(buf, 0, 12, 0)
      if (bytesRead < 8) return true
      if (ext === '.webm' || ext === '.mkv') {
        return !(buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3)
      }
      return buf.toString('ascii', 4, 8) !== 'ftyp'
    } finally {
      await handle.close()
    }
  } catch {
    return true
  }
}

export async function openAllowedPath(targetPath: string, roots: string[], mode: 'open' | 'reveal'): Promise<string> {
  let resolved: string
  try {
    resolved = assertAllowedPath(targetPath, roots, mode === 'reveal' ? '文件位置' : '文件路径')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('无效')) return mode === 'reveal' ? '没有可打开的文件位置' : '没有可播放的文件'
    if (message.includes('允许范围')) return '无法打开这个路径'
    return message
  }

  try {
    const stat = await fs.stat(resolved)
    if (mode === 'reveal') {
      if (stat.isDirectory()) {
        const err = await shell.openPath(resolved)
        return err ? mapShellError(err, 'folder') : ''
      }
      shell.showItemInFolder(resolved)
      return ''
    }

    if (stat.isFile()) {
      if (stat.size <= 0) return '文件是空的，可能下载或转换不完整'
      if (await looksLikeBrokenMedia(resolved, stat.size)) return '文件可能已损坏，无法播放'
    }

    const err = await shell.openPath(resolved)
    return err ? mapShellError(err, stat.isDirectory() ? 'folder' : 'file') : ''
  } catch (error) {
    if (mode === 'reveal') {
      const parent = path.dirname(resolved)
      try {
        const parentStat = await fs.stat(parent)
        if (parentStat.isDirectory()) {
          const err = await shell.openPath(parent)
          if (err) return mapShellError(err, 'folder')
          return '文件已不在原位置，已打开所在文件夹'
        }
      } catch {
        // fall through
      }
      return mapNodeError(error, 'folder')
    }
    const kind = path.extname(resolved) ? 'file' : 'folder'
    return mapNodeError(error, kind)
  }
}
