import type { ToastMessageOptions } from 'primevue/toast'

type MittEventMap = {
  'toast:add': ToastMessageOptions
  'toast:remove': ToastMessageOptions
  'toast:removeGroup': string
  'toast:removeAllGroups': void
}
