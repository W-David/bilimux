import { defineConfig, presetAttributify, presetIcons, presetWind3 as presetUno, presetWebFonts } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      collections: {
        mdi: () => import('@iconify-json/mdi/icons.json').then(i => i.default)
      },
      extraProperties: {
        display: 'inline-block',
        'vertical-align': 'middle'
      }
    }),
    presetWebFonts({
      provider: 'google',
      fonts: {
        sans: 'Roboto',
        mono: 'Fira Code'
      }
      // processors: createLocalFontProcessor({
      //   cacheDir: 'node_modules/.cache/unocss/fonts',
      //   fontAssetsDir: 'resources/assets/fonts',
      //   fontServeBaseUrl: '/assets/fonts'
      // })
    })
  ]
})
