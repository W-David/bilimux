import Layout from '@renderer/layout/index.vue'
import Main from '@renderer/layout/Main.vue'
import About from '@renderer/pages/About.vue'
import ConvertComplete from '@renderer/pages/convert/complete.vue'
import ConvertEntire from '@renderer/pages/convert/entire.vue'
import ConvertIndex from '@renderer/pages/convert/index.vue'
import ConvertUnconverted from '@renderer/pages/convert/unconverted.vue'
import Auth from '@renderer/pages/download/auth.vue'
import Download from '@renderer/pages/download/index.vue'
import Task from '@renderer/pages/download/task.vue'
import SettingConvert from '@renderer/pages/setting/convert.vue'
import SettingDownload from '@renderer/pages/setting/download.vue'
import SettingIndex from '@renderer/pages/setting/index.vue'
import SettingNormal from '@renderer/pages/setting/normal.vue'
import SettingUser from '@renderer/pages/setting/user.vue'
import { useAuthStore } from '@renderer/store/auth'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { findChildIndex } from './utils'

// 转换管理页最后停留的分组，父路由重定向时使用，避免每次进入都被重置到“未完成”
let lastConvertTabName = 'convert-unconverted'
// 设置页最后停留的分组，父路由重定向时使用
let lastSettingTabName = 'prefer-normal'

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
            component: ConvertIndex,
            redirect: () => ({ name: lastConvertTabName }),
            meta: {
              activeMenu: 'convert'
            },
            children: [
              {
                path: 'entire',
                name: 'convert-entire',
                component: ConvertEntire,
                meta: {
                  switchTransition: true,
                  activeMenu: 'convert'
                }
              },
              {
                path: 'complete',
                name: 'convert-complete',
                component: ConvertComplete,
                meta: {
                  switchTransition: true,
                  activeMenu: 'convert'
                }
              },
              {
                path: 'unconverted',
                name: 'convert-unconverted',
                component: ConvertUnconverted,
                meta: {
                  switchTransition: true,
                  activeMenu: 'convert'
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
              activeMenu: 'download'
            }
          },
          {
            path: 'about',
            name: 'about',
            component: About
          },
          {
            path: 'prefer',
            name: 'prefer',
            component: SettingIndex,
            redirect: () => ({ name: lastSettingTabName }),
            meta: {
              activeMenu: 'prefer'
            },
            children: [
              {
                path: 'normal',
                name: 'prefer-normal',
                component: SettingNormal,
                meta: {
                  switchTransition: true,
                  activeMenu: 'prefer'
                }
              },
              {
                path: 'user',
                name: 'prefer-user',
                component: SettingUser,
                meta: {
                  switchTransition: true,
                  activeMenu: 'prefer'
                }
              },
              {
                path: 'convert',
                name: 'prefer-convert',
                component: SettingConvert,
                meta: {
                  switchTransition: true,
                  activeMenu: 'prefer'
                }
              },
              {
                path: 'download',
                name: 'prefer-download',
                component: SettingDownload,
                meta: {
                  switchTransition: true,
                  activeMenu: 'prefer'
                }
              }
            ]
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

router.beforeEach(async to => {
  const authStore = useAuthStore()
  if (to.meta.requireAuth && !authStore.isAuthenticated) {
    // 等待启动时的登录态检查完成，避免首次进入下载页被误判为未登录
    await authStore.ensureReady()
    if (!authStore.isAuthenticated) {
      return { name: 'download-auth' }
    }
  }
  return
})

router.afterEach((to, from) => {
  // 记录最后一次停留的转换/设置分组，供父路由重定向回到原分组
  if (to.meta.switchTransition && typeof to.name === 'string') {
    if (to.meta.activeMenu === 'prefer') {
      lastSettingTabName = to.name
    } else {
      lastConvertTabName = to.name
    }
  }

  // 首次进入或不完整的路由不做过渡
  if (to.matched.length < 3 || from.matched.length < 3) {
    return
  }

  // 菜单级顺序：Main.children 里页面记录的下标
  const toPageIndex = findChildIndex(to.matched[1], to.matched[2])
  const fromPageIndex = findChildIndex(from.matched[1], from.matched[2])

  if (from.meta.switchTransition && to.meta.switchTransition) {
    // 只有同一个分组（设置页 ↔ 设置页 / 转换管理 ↔ 转换管理）才使用左右滑动
    if (to.meta.activeMenu && to.meta.activeMenu === from.meta.activeMenu) {
      // 分组内顺序：分组容器 children 里子页记录的下标
      const toGroupIndex = findChildIndex(to.matched[2], to.matched[3])
      const fromGroupIndex = findChildIndex(from.matched[2], from.matched[3])
      to.meta.transition = toGroupIndex >= fromGroupIndex ? 'slide-left' : 'slide-right'
    } else {
      to.meta.transition = toPageIndex >= fromPageIndex ? 'slide-up' : 'slide-down'
    }
  } else {
    to.meta.transition = toPageIndex >= fromPageIndex ? 'slide-up' : 'slide-down'
  }
})

export default router
