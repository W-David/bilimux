import {
  CircleCheck as CircleCheckIcon,
  Download as DownloadIcon,
  Film as FilmIcon,
  Info as InfoIcon,
  List as ListIcon,
  Settings as SettingsIcon,
  User as UserIcon
} from '@lucide/vue'
import Layout from '@renderer/layout/index.vue'
import Main from '@renderer/layout/Main.vue'
import About from '@renderer/pages/About.vue'
import ConvertComplete from '@renderer/pages/convert/complete.vue'
import ConvertIndex from '@renderer/pages/convert/index.vue'
import ConvertWaiting from '@renderer/pages/convert/waiting.vue'
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
import { findChildIndex, sectionRecord } from './utils'

// 转换管理页最后停留的分组，父路由重定向时使用
let lastConvertTabName = 'convert-complete'
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
              switchTransition: true,
              menu: { label: '转换管理', icon: ListIcon, description: '客户端缓存视频转 MP4' }
            },
            children: [
              {
                path: 'waiting',
                name: 'convert-waiting',
                component: ConvertWaiting,
                meta: {
                  tab: { label: '待转换', icon: ListIcon }
                }
              },
              {
                path: 'complete',
                name: 'convert-complete',
                component: ConvertComplete,
                meta: {
                  tab: { label: '已完成', icon: CircleCheckIcon }
                }
              },
              {
                path: 'unconverted',
                name: 'convert-unconverted',
                redirect: { name: 'convert-complete' }
              }
            ]
          },
          {
            path: 'download',
            name: 'download',
            component: Download,
            meta: {
              menu: { label: '下载', icon: DownloadIcon, description: '收藏夹视频下载' }
            },
            children: [
              {
                path: 'auth',
                name: 'download-auth',
                component: Auth
              },
              {
                path: 'task',
                name: 'download-task',
                component: Task,
                meta: {
                  requireAuth: true
                }
              }
            ]
          },
          {
            path: 'about',
            name: 'about',
            component: About,
            meta: {
              menu: { label: '关于', icon: InfoIcon }
            }
          },
          {
            path: 'prefer',
            name: 'prefer',
            component: SettingIndex,
            redirect: () => ({ name: lastSettingTabName }),
            meta: {
              switchTransition: true,
              menu: { label: '设置', icon: SettingsIcon, description: '设置' }
            },
            children: [
              {
                path: 'normal',
                name: 'prefer-normal',
                component: SettingNormal,
                meta: {
                  tab: { label: '常规设置', icon: SettingsIcon }
                }
              },
              {
                path: 'user',
                name: 'prefer-user',
                component: SettingUser,
                meta: {
                  tab: { label: '用户设置', icon: UserIcon }
                }
              },
              {
                path: 'convert',
                name: 'prefer-convert',
                component: SettingConvert,
                meta: {
                  tab: { label: '视频转换', icon: FilmIcon }
                }
              },
              {
                path: 'download',
                name: 'prefer-download',
                component: SettingDownload,
                meta: {
                  tab: { label: '视频下载', icon: DownloadIcon }
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

  if (to.name === 'download') {
    await authStore.ensureReady()
    return { name: authStore.isAuthenticated ? 'download-task' : 'download-auth' }
  }

  if (to.name === 'download-auth') {
    await authStore.ensureReady()
    if (authStore.isAuthenticated) {
      return { name: 'download-task' }
    }
    return
  }

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
    const section = sectionRecord(to)
    if (section?.name === 'prefer') {
      lastSettingTabName = to.name
    } else if (section?.name === 'convert') {
      lastConvertTabName = to.name
    }
  }

  // 首次进入或不完整的路由不做过渡
  if (to.matched.length < 3 || from.matched.length < 3) {
    return
  }

  // 菜单级顺序：Main.children 里页面记录的下标
  const toSection = sectionRecord(to)
  const fromSection = sectionRecord(from)
  const toPageIndex = findChildIndex(to.matched[1], toSection)
  const fromPageIndex = findChildIndex(from.matched[1], fromSection)

  if (
    from.meta.switchTransition &&
    to.meta.switchTransition &&
    toSection?.name &&
    toSection.name === fromSection?.name
  ) {
    // 同一栏目内的子页：按栏目 children 下标左右滑动
    const toGroupIndex = findChildIndex(toSection, to.matched[3])
    const fromGroupIndex = findChildIndex(fromSection, from.matched[3])
    to.meta.transition = toGroupIndex >= fromGroupIndex ? 'slide-left' : 'slide-right'
  } else {
    to.meta.transition = toPageIndex >= fromPageIndex ? 'slide-up' : 'slide-down'
  }
})

export default router
