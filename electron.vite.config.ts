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
    resolve: {
      alias: {
        '@main': path.resolve(__dirname, './src/main'),
        '@shared': path.resolve(__dirname, './src/shared')
      }
    },
    build: {
      externalizeDeps: {
        exclude: ['electron-store', 'got']
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
        '@preload': path.resolve(__dirname, './src/preload'),
        '@shared': path.resolve(__dirname, './src/shared')
      }
    },
    plugins: [
      vue(),
      UnoCSS({
        configFile: './uno.config.ts'
      }),
      Components({
        dirs: ['src/renderer/src/components', 'src/renderer/src/layout'],
        resolvers: [PrimeVueResolver()]
      }),
      Inspector({
        enabled: false
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
