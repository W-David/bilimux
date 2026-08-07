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
    })
  ],
  shortcuts: {
    'bg-card': 'border border-1 border-black/5 border-solid bg-#121212 shadow-black/50 shadow-sm hover:bg-#202020',
    'cover-mask':
      'relative hover:after:opacity-100 after:absolute after:inset-0 after:bg-black/20 after:opacity-0 after:transition-opacity after:duration-200 after:content-empty'
  }
})
