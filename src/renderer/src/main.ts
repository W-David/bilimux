import '@unocss/reset/normalize.css'
import 'virtual:uno.css'
import { createApp } from 'vue'
import App from './App.vue'
import './styles/base.css'

import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'
import router from './router'
import { usePreferenceStore } from './store/preference'

const MyPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fff0f5',
      100: '#ffe3ec',
      200: '#ffc6da',
      300: '#ff9aba',
      400: '#ff6496',
      500: '#fb7299',
      600: '#e6537d',
      700: '#c33960',
      800: '#a1264b',
      900: '#85223f',
      950: '#4d0e1f'
    }
  }
})

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(ToastService)
app.use(ConfirmationService)
app.use(PrimeVue, {
  ripple: true,
  theme: {
    preset: MyPreset,
    options: {
      cssLayer: {
        name: 'primevue'
      }
    }
  }
})

router.isReady().then(() => {
  usePreferenceStore()
    .fetchPreference()
    .then(() => {
      app.mount('#app')
      router.push({ name: 'convert' })
    })
    .catch((error) => {
      throw error
    })
})
