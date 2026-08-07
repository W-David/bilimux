export type ToastMessageOptions = {
  severity?: 'info' | 'success' | 'warn' | 'error'
  summary?: string
  detail?: string
  closable?: boolean
  life?: number
  group?: string
}

type MittEventMap = {
  'toast:add': ToastMessageOptions
  'toast:remove': ToastMessageOptions
  'toast:removeGroup': string
  'toast:removeAllGroups': void
}
