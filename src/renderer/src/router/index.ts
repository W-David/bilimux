import { createMemoryHistory, createRouter, RouteRecordRaw } from 'vue-router'

const About = () => import('@renderer/components/About.vue')
const Convert = () => import('@renderer/components/ConvertTask.vue')
const Layout = () => import('@renderer/components/Layout.vue')
const Main = () => import('@renderer/components/Main.vue')
const Settings = () => import('@renderer/components/Prefer.vue')

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
            path: 'about',
            name: 'about',
            component: About,
            meta: {
              order: 2
            }
          },
          {
            path: 'settings',
            name: 'settings',
            component: Settings,
            meta: {
              order: 3
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
