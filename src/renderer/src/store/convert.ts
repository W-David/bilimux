import {
  clearConvertHistories,
  getConvertHistories,
  prescanConvert,
  removeConvertHistory,
  startProcess,
  subscribeConvertPrescanDone,
  subscribeProcessBrokeEvent,
  subscribeProcessItemEndEvent,
  subscribeProcessItemProgressEvent,
  subscribeProcessItemStartEvent,
  subscribeProcessReadyEvent,
  subscribeProcessStartEvent,
  subscribeProcessSuccessEvent
} from '@renderer/api'
import type { ConvertTask } from '@renderer/types/convert'
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
  processing: 'waiting',
  scanned: 'scanned'
}

const UNCONVERTED_HISTORY_STATUS = new Set(['failed', 'interrupted', 'missing', 'scanned'])
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

  /** 未完成：实时等待/失败/中断/丢失 + 历史失败/跳过/中断/丢失 */
  const unconvertedList = computed<ConvertTask[]>(() => {
    const live = Array.from(tasks.value.values()).filter(
      task =>
        task.status === 'waiting' ||
        task.status === 'scanned' ||
        task.status === 'fail' ||
        task.status === 'interrupted' ||
        task.status === 'missing'
    )
    const historyTasks = history.value
      .filter(record => !liveBvids.value.has(record.bvid) && UNCONVERTED_HISTORY_STATUS.has(record.status))
      .map(toTask)
    return [...live, ...historyTasks]
  })

  /** 已完成：实时成功/跳过 + 历史完成（文件存在） */
  const completedList = computed<ConvertTask[]>(() => {
    const live = Array.from(tasks.value.values()).filter(task => task.status === 'success' || task.status === 'skipped')
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

  const prescan = async (): Promise<void> => {
    if (runStatus.value === 'scanning' || runStatus.value === 'processing') return
    runStatus.value = 'scanning'
    mittbus.emit('toast:add', {
      severity: 'info',
      message: '正在预扫描…'
    })
    try {
      const result = await prescanConvert()
      historyVersion += 1
      await loadHistory()
      if (!result.cacheOk) {
        runStatus.value = 'error'
        errorMessage.value = result.message || '预扫描失败'
        mittbus.emit('toast:add', {
          severity: 'error',
          message: result.message || '预扫描失败'
        })
        return
      }
      runStatus.value = 'idle'
      mittbus.emit('toast:add', {
        severity: 'success',
        message: `预扫描完成，待转换 ${result.pending} 条`
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      runStatus.value = 'error'
      errorMessage.value = message
      mittbus.emit('toast:add', {
        severity: 'error',
        message
      })
    }
  }

  /** 开始一次转换 */
  const start = async (): Promise<void> => {
    if (runStatus.value === 'scanning' || runStatus.value === 'processing') return
    tasks.value = new Map()
    successCount.value = 0
    failCount.value = 0
    errorMessage.value = ''
    runStatus.value = 'scanning'
    try {
      await startProcess()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      runStatus.value = 'error'
      errorMessage.value = message
      mittbus.emit('toast:add', {
        severity: 'error',
        message
      })
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
      // 用历史对账信息（文件存在性、状态等）补全保留下来的 live 任务，不替换列表本身
      const recordMap = new Map(records.map(record => [record.bvid, record]))
      for (const task of tasks.value.values()) {
        const record = recordMap.get(task.bvid)
        if (!record) continue
        task.outputPath = record.outputPath || task.outputPath || ''
        task.fileExists = record.fileExists
        task.runId = record.runId
        task.startedAt = record.startedAt
        task.completedAt = record.completedAt
        task.updatedAt = record.updatedAt
        task.fileSize = record.fileSize
        task.durationMs = record.durationMs
        task.status = HISTORY_STATUS_MAP[record.status]
      }
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
    try {
      await removeConvertHistory(task.bvid)
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
      mittbus.emit('toast:add', {
        severity: count.fail > 0 ? 'warn' : 'success',
        message: `转换完成：成功 ${count.success}，失败 ${count.fail}`
      })
      // 保留 live 任务，只更新内部状态，保证从扫描到完成的列表顺序不变；
      // 后台加载历史仅用于对账（文件存在性等），不会替换 live 列表
      void loadHistory()
    })

    subscribeProcessBrokeEvent(({ reason }) => {
      runStatus.value = 'error'
      errorMessage.value = reason
      mittbus.emit('toast:add', {
        severity: 'error',
        message: reason
      })
    })

    subscribeConvertPrescanDone(() => {
      void loadHistory()
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
    prescan,
    start,
    reset,
    loadHistory,
    clearHistory,
    removeItem
  }
})
