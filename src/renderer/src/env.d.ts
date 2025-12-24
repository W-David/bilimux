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
    transition?: string
  }
}

declare module '@vue/runtime-dom' {
  interface HTMLAttributes {
    [key: string]: unknown
  }
}
declare module '@vue/runtime-core' {
  interface AllowedComponentProps {
    [key: string]: unknown
  }
}
export {}
