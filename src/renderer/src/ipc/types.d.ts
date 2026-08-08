import type { ExternalToast } from 'vue-sonner'

export type ToastMessageOptions = {
  severity: 'info' | 'success' | 'warn' | 'error'
  message: string
  data?: ExternalToast
}

type MittEventMap = {
  'toast:add': ToastMessageOptions
  'download:history:cleared': undefined
}
