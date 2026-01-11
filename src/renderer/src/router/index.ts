import Layout from '@renderer/layout/Layout.vue'
import Main from '@renderer/layout/Main.vue'
import About from '@renderer/pages/About.vue'
import Convert from '@renderer/pages/Convert.vue'
import Download from '@renderer/pages/Download.vue'
import Prefer from '@renderer/pages/Prefer.vue'
import { createMemoryHistory, createRouter, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: Layout,
    children: [
      {
        path: '',
        name: 'main',
        component: Main,
        children: [
          {
            path: 'convert',
            name: 'convert',
            component: Convert,
            meta: {
              order: 1
            }
          },
          {
            path: 'download',
            name: 'download',
            component: Download,
            meta: {
              order: 2
            }
          },
          {
            path: 'about',
            name: 'about',
            component: About,
            meta: {
              order: 3
            }
          },
          {
            path: 'prefer',
            name: 'prefer',
            component: Prefer,
            meta: {
              order: 4
            }
          }
        ]
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createMemoryHistory(),
  routes
})

router.afterEach((to, from) => {
  const fromOrder = from.meta.order as number
  const toOrder = to.meta.order as number
  const transition = toOrder >= fromOrder ? 'main-slide-up' : 'main-slide-down'
  to.meta.transition = transition
})

export default router
