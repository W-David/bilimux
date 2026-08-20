/// <reference types="vite/client" />
/// <reference types="vue-router" />

import type { Component } from 'vue'
import { ElectronAPI } from '../../preload/index'

declare global {
  interface Window {
    electron: ElectronAPI
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    switchTransition?: boolean
    transition?: string
    menu?: {
      label: string
      icon: Component
      description?: string
    }
    tab?: {
      label: string
      icon: Component
      description?: string
    }
  }
}

export {}
