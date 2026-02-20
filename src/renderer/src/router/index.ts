import Layout from '@renderer/layout/index.vue'
import Main from '@renderer/layout/Main.vue'
import About from '@renderer/pages/about.vue'
import Convert from '@renderer/pages/convert.vue'
import Auth from '@renderer/pages/download/auth.vue'
import Download from '@renderer/pages/download/index.vue'
import Task from '@renderer/pages/download/task.vue'
import Prefer from '@renderer/pages/prefer.vue'
import { useAuthStore } from '@renderer/store/auth'
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
            component: Download,
            children: [
              {
                path: 'auth',
                name: 'download-auth',
                component: Auth,
                meta: {
                  activeMenu: 'download'
                }
              },
              {
                path: 'task',
                name: 'download-task',
                component: Task,
                meta: {
                  requireAuth: true,
                  activeMenu: 'download'
                }
              }
            ],
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

router.beforeEach(to => {
  const authStore = useAuthStore()
  const isAuthenticated = authStore.isAuthenticated
  if (to.meta.requireAuth && !isAuthenticated) {
    return { name: 'download-auth' }
  }
  return
})

router.afterEach((to, from) => {
  if (to.meta.order === undefined || from.meta.order === undefined) {
    return
  }
  const fromOrder = from.meta.order as number
  const toOrder = to.meta.order as number
  const transition = toOrder >= fromOrder ? 'main-slide-up' : 'main-slide-down'
  to.meta.transition = transition
})

export default router
