import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'electron-vite'
import path from 'path'
import Components from 'unplugin-vue-components/vite'

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
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, './src/shared')
      }
    },
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
      tailwindcss(),
      Components({
        dirs: ['src/components', 'src/layout']
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
