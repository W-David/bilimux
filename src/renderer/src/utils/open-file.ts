import { emitter, mittbus } from '@renderer/ipc'

function notify(message: string, severity: 'error' | 'warn' = 'error'): void {
  mittbus.emit('toast:add', { severity, message })
}

export async function openLocalPath(targetPath: string, emptyMessage = '没有可播放的文件'): Promise<void> {
  if (!targetPath.trim()) {
    notify(emptyMessage, 'warn')
    return
  }
  try {
    const errMessage = await emitter.invoke('open-path', targetPath)
    if (!errMessage) return
    notify(errMessage, errMessage.includes('已打开') ? 'warn' : 'error')
  } catch (error) {
    notify(error instanceof Error ? error.message : '无法打开这个文件，可能已被删除或损坏')
  }
}

export async function revealLocalPath(targetPath: string, emptyMessage = '没有可打开的文件位置'): Promise<void> {
  if (!targetPath.trim()) {
    notify(emptyMessage, 'warn')
    return
  }
  try {
    const errMessage = await emitter.invoke('open-folder', targetPath)
    if (!errMessage) return
    notify(errMessage, errMessage.includes('已打开') ? 'warn' : 'error')
  } catch (error) {
    notify(error instanceof Error ? error.message : '无法打开文件所在位置')
  }
}
