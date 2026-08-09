import { createApp } from 'vue'
import 'vue-sonner/style.css'
import App from './App.vue'
import './styles/base.css'

import { createPinia } from 'pinia'
import router from './router'
import { useAuthStore } from './store/auth'
import { usePreferenceStore } from './store/preference'

const pinia = createPinia()
const app = createApp(App)

document.documentElement.classList.add('dark')

app.use(pinia)
app.use(router)

const initApp = () => {
  usePreferenceStore()
    .fetchPreference()
    .then(() => {
      app.mount('#app')
      // 应用挂载后再检查登录态，确保失效提示的 toast 监听已就绪
      useAuthStore().ensureReady()
      router.push({ name: 'convert' })
    })
    .catch(error => {
      throw error
    })
}

router.isReady().then(() => initApp())
