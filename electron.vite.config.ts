import { PrimeVueResolver } from '@primevue/auto-import-resolver'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'electron-vite'
import path from 'path'
import UnoCSS from 'unocss/vite'
import Components from 'unplugin-vue-components/vite'
import Inspector from 'unplugin-vue-inspector/vite'

export default defineConfig({
  main: {
    plugins: [],
    build: {
      externalizeDeps: {
        exclude: ['electron-store']
      },
      outDir: 'out/main'
    }
  },
  preload: {
    plugins: [],
    build: {
      outDir: 'out/preload'
    }
  },
  renderer: {
    root: 'src/renderer',
    server: {
      port: 8880
    },
    resolve: {
      alias: {
        '@renderer': path.resolve(__dirname, './src/renderer/src'),
        '@preload': path.resolve(__dirname, './src/preload')
      }
    },
    plugins: [
      vue(),
      UnoCSS({
        configFile: './uno.config.ts'
      }),
      Components({
        resolvers: [PrimeVueResolver()]
      }),
      Inspector({
        enabled: true
      })
    ],
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, './src/renderer/index.html')
        }
      }
    }
  }
})
