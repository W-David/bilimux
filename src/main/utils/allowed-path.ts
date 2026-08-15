import { app } from 'electron'
import path from 'node:path'
import type ConfigManager from '../core/ConfigManager'
import { getEngineBinPath } from './index'

export function isPathInside(target: string, root: string): boolean {
  const resolvedTarget = path.resolve(target)
  const resolvedRoot = path.resolve(root)
  const relative = path.relative(resolvedRoot, resolvedTarget)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

export function getAllowedUserRoots(configManager: ConfigManager, platform: NodeJS.Platform): string[] {
  const store = configManager.getStore()
  const convert = store['convert-config']
  const download = store['download-config']
  return [
    convert.outputDir,
    convert.cachePath,
    download.outputDir,
    path.dirname(getEngineBinPath(platform)),
    app.getPath('userData'),
    app.getPath('logs')
  ].filter((item): item is string => Boolean(item))
}

export function assertAllowedPath(target: string, roots: string[], label = '路径'): string {
  if (typeof target !== 'string' || target.trim() === '') {
    throw new Error(`${label}无效`)
  }
  const resolved = path.resolve(target)
  if (!roots.some(root => isPathInside(resolved, root))) {
    throw new Error(`${label}不在允许范围内`)
  }
  return resolved
}
