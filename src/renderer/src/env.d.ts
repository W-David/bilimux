/// <reference types="vite/client" />
/// <reference types="vue-router" />

import { ElectronAPI } from '../../preload/index'

declare global {
  interface Window {
    electron: ElectronAPI
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    order?: number
    switchTransition?: boolean
    transition?: string
    requireAuth?: boolean
    activeMenu?: string
    innerTransition?: string
  }
}

export {}
