import {
  clearConvertHistories,
  getConvertHistories,
  removeConvertHistory,
  startProcess,
  subscribeProcessBrokeEvent,
  subscribeProcessItemEndEvent,
  subscribeProcessItemProgressEvent,
  subscribeProcessItemStartEvent,
  subscribeProcessReadyEvent,
  subscribeProcessStartEvent,
  subscribeProcessSuccessEvent
} from '@renderer/api'
import type { ConvertTask } from '@renderer/components/ConvertTaskItem.vue'
import { mittbus } from '@renderer/ipc'
import type { ConvertHistoryRecord } from '@shared/types'
import logger from 'electron-log/renderer'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type ConvertRunStatus = 'idle' | 'scanning' | 'processing' | 'success' | 'error'

const HISTORY_STATUS_MAP: Record<ConvertHistoryRecord['status'], ConvertTask['status']> = {
  completed: 'success',
  failed: 'fail',
  skipped: 'skipped',
  interrupted: 'interrupted',
  missing: 'missing',
  processing: 'waiting'
}

const UNCONVERTED_HISTORY_STATUS = new Set(['failed', 'interrupted', 'missing'])
let listenersRegistered = false
// 历史加载版本号：清空历史时递增，阻止清空前的异步加载结果把旧数据写回内存
let historyVersion = 0

/**
 * 转换任务全局 store：实时任务 + 转换历史合并，并提供分组视图数据
 */
export const useConvertStore = defineStore('convert', () => {
  const tasks = ref<Map<string, ConvertTask>>(new Map())
  const history = ref<ConvertHistoryRecord[]>([])
  const runStatus = ref<ConvertRunStatus>('idle')
  const errorMessage = ref('')
  const successCount = ref(0)
  const failCount = ref(0)

  const liveBvids = computed(() => new Set(tasks.value.keys()))

  /** 历史记录转成视图任务 */
  const toTask = (record: ConvertHistoryRecord): ConvertTask => {
    const fileName = record.outputPath ? record.outputPath.split(/[\\/]/).pop() || record.title : record.title
    return {
      id: `history:${record.id}`,
      bvid: record.bvid,
      title: record.title || fileName,
      fileName,
      filePath: record.outputPath || '',
      status: HISTORY_STATUS_MAP[record.status],
      progress: record.status === 'completed' || record.status === 'skipped' ? 100 : 0,
      finished: record.status !== 'processing',
      message: record.errorMessage || (record.status === 'skipped' ? '产物已存在，跳过合成' : ''),
      durationMs: record.durationMs,
      fileSize: record.fileSize,
      fileExists: record.fileExists,
      type: record.type,
      uname: record.uname,
      groupTitle: record.groupTitle,
      sourceDir: record.sourceDir,
      outputPath: record.outputPath || undefined,
      runId: record.runId,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      updatedAt: record.updatedAt
    }
  }

  /** 未完成：实时排队/失败 + 历史失败/跳过/中断/丢失 */
  const unconvertedList = computed<ConvertTask[]>(() => {
    const live = Array.from(tasks.value.values()).filter(task => task.status === 'waiting' || task.status === 'fail')
    const historyTasks = history.value
      .filter(record => !liveBvids.value.has(record.bvid) && UNCONVERTED_HISTORY_STATUS.has(record.status))
      .map(toTask)
    return [...live, ...historyTasks]
  })

  /** 已完成：实时成功 + 历史完成（文件存在） */
  const completedList = computed<ConvertTask[]>(() => {
    const live = Array.from(tasks.value.values()).filter(task => task.status === 'success')
    const historyTasks = history.value
      .filter(
        record => !liveBvids.value.has(record.bvid) && (record.status === 'completed' || record.status === 'skipped')
      )
      .map(toTask)
    return [...live, ...historyTasks]
  })

  /** 全部：实时任务 + 历史（同 bvid 时实时优先） */
  const entireList = computed<ConvertTask[]>(() => {
    const live = Array.from(tasks.value.values()).map(task => ({ ...task, id: `live:${task.id}` }))
    const historyTasks = history.value.filter(record => !liveBvids.value.has(record.bvid)).map(toTask)
    return [...live, ...historyTasks]
  })

  const counts = computed(() => ({
    unconverted: unconvertedList.value.length,
    completed: completedList.value.length,
    entire: entireList.value.length
  }))

  /** 开始一次转换 */
  const start = async (): Promise<void> => {
    tasks.value = new Map()
    successCount.value = 0
    failCount.value = 0
    errorMessage.value = ''
    runStatus.value = 'scanning'
    try {
      await startProcess()
    } catch (error) {
      runStatus.value = 'error'
      errorMessage.value = error instanceof Error ? error.message : String(error)
    }
  }

  /** 重置为初始状态 */
  const reset = (): void => {
    tasks.value = new Map()
    runStatus.value = 'idle'
    errorMessage.value = ''
    successCount.value = 0
    failCount.value = 0
  }

  /** 从主进程加载转换历史 */
  const loadHistory = async (): Promise<void> => {
    const version = historyVersion
    try {
      const records = await getConvertHistories()
      if (version !== historyVersion) return
      history.value = records
    } catch (error) {
      logger.warn('加载转换历史失败:', error)
    }
  }

  /** 清空转换历史 */
  const clearHistory = async (): Promise<void> => {
    // 先清空本地状态，保证 UI 立即生效；再删除数据库
    historyVersion += 1
    history.value = []
    tasks.value = new Map()
    try {
      await clearConvertHistories()
    } catch (error) {
      logger.error('清空转换历史失败:', error)
      throw error
    }
  }

  /** 删除单个任务：历史记录 + 产物文件 + UI 同步 */
  const removeItem = async (task: ConvertTask): Promise<void> => {
    const isHistory = task.id.startsWith('history:')
    const targetPath = task.outputPath || (isHistory ? task.filePath : undefined)
    try {
      await removeConvertHistory(task.bvid, targetPath || undefined)
      if (isHistory) {
        history.value = history.value.filter(record => record.bvid !== task.bvid)
      } else {
        tasks.value.delete(task.bvid)
        tasks.value = new Map(tasks.value)
      }
      mittbus.emit('toast:add', {
        severity: 'success',
        message: '已删除转换任务'
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      mittbus.emit('toast:add', {
        severity: 'error',
        message: `删除失败: ${message}`
      })
    }
  }

  // 全局只注册一份 process 事件监听
  if (!listenersRegistered) {
    listenersRegistered = true

    subscribeProcessStartEvent(() => {
      runStatus.value = 'scanning'
    })

    subscribeProcessReadyEvent(({ bvs }) => {
      runStatus.value = 'processing'
      const next = new Map<string, ConvertTask>()
      bvs.forEach(bv => {
        next.set(bv.bvid, {
          id: bv.bvid,
          bvid: bv.bvid,
          title: bv.title || bv.fileInfo.fileName,
          fileName: bv.fileInfo.fileName,
          filePath: bv.fileInfo.filePath,
          outputPath: '',
          type: bv.type,
          uname: bv.uname,
          groupTitle: bv.groupTitle,
          sourceDir: bv.fileInfo.dirPath,
          status: 'waiting',
          progress: 0,
          finished: false,
          message: '',
          startedAt: Date.now(),
          updatedAt: Date.now()
        })
      })
      tasks.value = next
    })

    subscribeProcessItemStartEvent(({ bv, outputPath }) => {
      const existing = tasks.value.get(bv.bvid)
      if (existing) {
        existing.outputPath = outputPath ?? ''
        existing.startedAt ??= Date.now()
      } else {
        tasks.value.set(bv.bvid, {
          id: bv.bvid,
          bvid: bv.bvid,
          title: bv.title || bv.fileInfo.fileName,
          fileName: bv.fileInfo.fileName,
          filePath: bv.fileInfo.filePath,
          outputPath: outputPath ?? '',
          type: bv.type,
          uname: bv.uname,
          groupTitle: bv.groupTitle,
          sourceDir: bv.fileInfo.dirPath,
          status: 'waiting',
          progress: 0,
          finished: false,
          message: '',
          startedAt: Date.now(),
          updatedAt: Date.now()
        })
      }
    })

    subscribeProcessItemProgressEvent(({ bvid, type, progress }) => {
      const task = tasks.value.get(bvid)
      if (task) {
        task.status = type
        task.progress = progress
      }
    })

    subscribeProcessItemEndEvent(({ bvid, success, message, skipped, durationMs, fileSize, outputPath }) => {
      const task = tasks.value.get(bvid)
      if (task) {
        task.finished = success
        task.status = success ? (skipped ? 'skipped' : 'success') : 'fail'
        task.progress = success ? 100 : 0
        task.message = message
        task.durationMs = durationMs ?? null
        task.fileSize = fileSize ?? null
        task.fileExists = success ? (fileSize ?? 0) > 0 : false
        task.outputPath = outputPath ?? task.outputPath ?? ''
        task.updatedAt = Date.now()
      }
    })

    subscribeProcessSuccessEvent(({ count }) => {
      runStatus.value = 'success'
      successCount.value = count.success
      failCount.value = count.fail
      // 转换结束后清除 live 任务残留，列表只保留历史记录
      tasks.value = new Map()
      void loadHistory()
    })

    subscribeProcessBrokeEvent(({ reason }) => {
      runStatus.value = 'error'
      errorMessage.value = reason
    })
  }

  return {
    tasks,
    history,
    runStatus,
    errorMessage,
    successCount,
    failCount,
    unconvertedList,
    completedList,
    entireList,
    counts,
    start,
    reset,
    loadHistory,
    clearHistory,
    removeItem
  }
})
