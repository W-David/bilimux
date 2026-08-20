import {
  Bookmark as BookmarkIcon,
  CircleCheck as CircleCheckIcon,
  Clapperboard as ClapperboardIcon,
  Download as DownloadIcon,
  Film as FilmIcon,
  HardDrive as HardDriveIcon,
  Info as InfoIcon,
  Library as LibraryIcon,
  List as ListIcon,
  ListTodo as ListTodoIcon,
  Loader as LoaderIcon,
  Settings as SettingsIcon,
  Tv as TvIcon
} from '@lucide/vue'
import Layout from '@renderer/layout/index.vue'
import Main from '@renderer/layout/Main.vue'
import LibraryCache from '@renderer/pages/library/cache.vue'
import LibraryCreated from '@renderer/pages/library/created.vue'
import LibraryFollow from '@renderer/pages/library/follow.vue'
import LibraryIndex from '@renderer/pages/library/index.vue'
import About from '@renderer/pages/About.vue'
import SettingConvert from '@renderer/pages/setting/convert.vue'
import SettingDownload from '@renderer/pages/setting/download.vue'
import SettingIndex from '@renderer/pages/setting/index.vue'
import SettingNormal from '@renderer/pages/setting/normal.vue'
import TasksActive from '@renderer/pages/tasks/active.vue'
import TasksAll from '@renderer/pages/tasks/all.vue'
import TasksComplete from '@renderer/pages/tasks/complete.vue'
import TasksIndex from '@renderer/pages/tasks/index.vue'
import { useAuthStore } from '@renderer/store/auth'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { findChildIndex, sectionRecord } from './utils'

let lastLibraryTabName = 'library-created'
let lastTasksTabName = 'tasks-all'
let lastSettingTabName = 'prefer-normal'

export function defaultLibraryTabName(authenticated: boolean): string {
  if (!authenticated) return 'library-cache'
  return lastLibraryTabName
}

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
            path: 'library',
            name: 'library',
            component: LibraryIndex,
            redirect: () => ({ name: lastLibraryTabName }),
            meta: {
              switchTransition: true,
              menu: { label: '片库', icon: LibraryIcon, description: '收藏、追番和本机缓存' }
            },
            children: [
              {
                path: 'created',
                name: 'library-created',
                component: LibraryCreated,
                meta: {
                  tab: { label: '收藏', icon: BookmarkIcon }
                }
              },
              {
                path: 'bangumi',
                name: 'library-bangumi',
                component: LibraryFollow,
                meta: {
                  tab: { label: '追番', icon: ClapperboardIcon }
                }
              },
              {
                path: 'cinema',
                name: 'library-cinema',
                component: LibraryFollow,
                meta: {
                  tab: { label: '追剧', icon: TvIcon }
                }
              },
              {
                path: 'cache',
                name: 'library-cache',
                component: LibraryCache,
                meta: {
                  tab: { label: '本机缓存', icon: HardDriveIcon }
                }
              }
            ]
          },
          {
            path: 'tasks',
            name: 'tasks',
            component: TasksIndex,
            redirect: () => ({ name: lastTasksTabName }),
            meta: {
              switchTransition: true,
              menu: { label: '任务', icon: ListTodoIcon, description: '下载与转换任务' }
            },
            children: [
              {
                path: 'all',
                name: 'tasks-all',
                component: TasksAll,
                meta: {
                  tab: { label: '全部', icon: ListIcon }
                }
              },
              {
                path: 'active',
                name: 'tasks-active',
                component: TasksActive,
                meta: {
                  tab: { label: '进行中', icon: LoaderIcon }
                }
              },
              {
                path: 'complete',
                name: 'tasks-complete',
                component: TasksComplete,
                meta: {
                  tab: { label: '已完成', icon: CircleCheckIcon }
                }
              }
            ]
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
              },
              {
                path: 'about',
                name: 'prefer-about',
                component: About,
                meta: {
                  tab: { label: '关于', icon: InfoIcon }
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
  if (to.name === 'library') {
    await authStore.ensureReady()
    return { name: defaultLibraryTabName(authStore.isAuthenticated) }
  }
  return
})

router.afterEach((to, from) => {
  if (to.meta.switchTransition && typeof to.name === 'string') {
    const section = sectionRecord(to)
    if (section?.name === 'prefer') {
      lastSettingTabName = to.name
    } else if (section?.name === 'library' && to.meta.tab) {
      lastLibraryTabName = to.name
    } else if (section?.name === 'tasks' && to.meta.tab) {
      lastTasksTabName = to.name
    }
  }

  if (to.matched.length < 3 || from.matched.length < 3) {
    return
  }

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
    const toGroupIndex = findChildIndex(toSection, to.matched[3])
    const fromGroupIndex = findChildIndex(fromSection, from.matched[3])
    to.meta.transition = toGroupIndex >= fromGroupIndex ? 'slide-left' : 'slide-right'
  } else {
    to.meta.transition = toPageIndex >= fromPageIndex ? 'slide-up' : 'slide-down'
  }
})

export default router
