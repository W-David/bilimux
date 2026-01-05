/// <reference types="vite/client" />
/// <reference types="vue-router" />

import type { AttributifyAttributes } from '@unocss/preset-attributify'
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
  interface HTMLAttributes extends AttributifyAttributes {}
}

export {}
