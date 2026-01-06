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
import Tooltip from 'primevue/tooltip'
import router from './router'
import { usePreferenceStore } from './store/preference'

const bilimuxPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{pink.50}',
      100: '{pink.100}',
      200: '{pink.200}',
      300: '{pink.300}',
      400: '{pink.400}',
      500: '{pink.500}',
      600: '{pink.600}',
      700: '{pink.700}',
      800: '{pink.800}',
      900: '{pink.900}',
      950: '{pink.950}'
    }
  }
})

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(ToastService)
app.directive('tooltip', Tooltip)
app.use(ConfirmationService)
app.use(PrimeVue, {
  ripple: true,
  theme: {
    preset: bilimuxPreset,
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
    .catch(error => {
      throw error
    })
})
