import Layout from '@renderer/layout/index.vue'
import Main from '@renderer/layout/Main.vue'
import About from '@renderer/pages/About.vue'
import Convert from '@renderer/pages/Convert.vue'
import ConvertComplete from '@renderer/pages/convert/complete.vue'
import ConvertEntire from '@renderer/pages/convert/entire.vue'
import ConvertIndex from '@renderer/pages/convert/index.vue'
import ConvertUnconverted from '@renderer/pages/convert/unconverted.vue'
import Auth from '@renderer/pages/download/auth.vue'
import Download from '@renderer/pages/download/index.vue'
import Task from '@renderer/pages/download/task.vue'
import Prefer from '@renderer/pages/Prefer.vue'
import { useAuthStore } from '@renderer/store/auth'
import { createMemoryHistory, createRouter, RouteRecordRaw } from 'vue-router'

// 转换管理页最后停留的分组，父路由重定向时使用，避免每次进入都被重置到“未完成”
let lastConvertTabName = 'convert-manager-unconverted'

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
              order: 0
            }
          },
          {
            path: 'convert-manager',
            name: 'convert-manager',
            component: ConvertIndex,
            redirect: () => ({ name: lastConvertTabName }),
            meta: {
              order: 1,
              activeMenu: 'convert-manager'
            },
            children: [
              {
                path: 'entire',
                name: 'convert-manager-entire',
                component: ConvertEntire,
                meta: {
                  switchTransition: true,
                  order: 1,
                  activeMenu: 'convert-manager'
                }
              },
              {
                path: 'complete',
                name: 'convert-manager-complete',
                component: ConvertComplete,
                meta: {
                  switchTransition: true,
                  order: 2,
                  activeMenu: 'convert-manager'
                }
              },
              {
                path: 'unconverted',
                name: 'convert-manager-unconverted',
                component: ConvertUnconverted,
                meta: {
                  switchTransition: true,
                  order: 3,
                  activeMenu: 'convert-manager'
                }
              }
            ]
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
  // 记录最后一次停留的转换分组，供父路由重定向回到原分组
  if (to.meta.switchTransition && typeof to.name === 'string') {
    lastConvertTabName = to.name
  }

  if (to.meta.order === undefined || from.meta.order === undefined) {
    return
  }

  const fromOrder = from.meta.order as number
  const toOrder = to.meta.order as number

  if (from.meta.switchTransition && to.meta.switchTransition) {
    to.meta.transition = toOrder >= fromOrder ? 'convert-slide-forward' : 'convert-slide-backward'
  } else {
    to.meta.transition = toOrder >= fromOrder ? 'main-slide-up' : 'main-slide-down'
  }
})

export default router
