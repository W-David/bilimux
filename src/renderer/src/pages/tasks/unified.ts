import { useConvertStore } from '@renderer/store/convert'
import { useDownloadStore, type DownloadTaskRow } from '@renderer/store/download'
import type { ConvertTask } from '@renderer/types/convert'
import { computed } from 'vue'

export type UnifiedTask =
  | { kind: 'download'; id: string; sort: number; row: DownloadTaskRow }
  | { kind: 'convert'; id: string; sort: number; task: ConvertTask }

const CONVERT_ACTIVE = new Set(['waiting', 'preprocess', 'importing', 'writing'])
const CONVERT_DONE = new Set(['success', 'fail', 'skipped', 'interrupted', 'missing'])

export function isConvertActive(task: ConvertTask): boolean {
  if (task.status === 'scanned') return false
  return CONVERT_ACTIVE.has(task.status)
}

function isConvertDone(task: ConvertTask): boolean {
  return CONVERT_DONE.has(task.status)
}

export function useUnifiedTasks() {
  const downloadStore = useDownloadStore()
  const convertStore = useConvertStore()

  const downloadRows = computed<UnifiedTask[]>(() => {
    const rows = [...downloadStore.activeList, ...downloadStore.completedList]
    return rows.map(row => ({
      kind: 'download' as const,
      id: `dl:${row.video.bvid}:${row.page.cid}`,
      sort: row.history?.updatedAt || 0,
      row
    }))
  })

  const convertRows = computed<UnifiedTask[]>(() => {
    return convertStore.entireList
      .filter(task => task.status !== 'scanned')
      .map(task => ({
        kind: 'convert' as const,
        id: `cv:${task.id}`,
        sort: task.updatedAt || task.startedAt || 0,
        task
      }))
  })

  const all = computed(() =>
    [...downloadRows.value, ...convertRows.value].sort((a, b) => b.sort - a.sort || a.id.localeCompare(b.id))
  )

  const active = computed(() =>
    all.value.filter(item => {
      if (item.kind === 'download') return downloadStore.partLane(item.row.video.bvid, item.row.page.cid) === 'active'
      return isConvertActive(item.task)
    })
  )

  const complete = computed(() =>
    all.value.filter(item => {
      if (item.kind === 'download')
        return downloadStore.partLane(item.row.video.bvid, item.row.page.cid) === 'completed'
      return isConvertDone(item.task)
    })
  )

  return { all, active, complete }
}
