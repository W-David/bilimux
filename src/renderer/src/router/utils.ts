import { type RouteLocationNormalizedLoaded, type RouteRecordNormalized, type RouteRecordRaw } from 'vue-router'

/**
 * Main 下的栏目记录（convert / download / about / prefer）。
 */
export function sectionRecord(
  route: Pick<RouteLocationNormalizedLoaded, 'matched'>
): RouteRecordNormalized | undefined {
  const mainIndex = route.matched.findIndex(record => record.name === 'main')
  if (mainIndex === -1) {
    return undefined
  }
  return route.matched[mainIndex + 1]
}

/** 父路由配置里带 meta.tab 的子路由，按定义顺序。读的是未合并的 children。 */
export function getChildTabs(parent: RouteRecordNormalized | undefined): RouteRecordRaw[] {
  return (parent?.children ?? []).filter(child => Boolean(child.name && child.meta?.tab))
}

/** 父路由配置里带 meta.menu 的子路由，按定义顺序。读的是未合并的 children。 */
export function getChildMenus(parent: RouteRecordNormalized | undefined): RouteRecordRaw[] {
  return (parent?.children ?? []).filter(child => Boolean(child.name && child.meta?.menu))
}

/**
 * 按 router 定义顺序查找子记录在父级 children 中的下标，
 * 用于决定页面/分组切换的动画方向，不再依赖 meta.order。
 */
export function findChildIndex(
  parent: RouteRecordNormalized | undefined,
  target: RouteRecordNormalized | undefined
): number {
  if (!parent || !target) {
    return 0
  }
  const index = parent.children.findIndex(child => {
    if (child.name && target.name && child.name === target.name) {
      return true
    }
    // children 里是原始配置记录（相对路径），target 是标准化记录（完整路径）
    const childPath = child.path.startsWith('/') ? child.path : `${parent.path}/${child.path}`.replace(/\/+/g, '/')
    return childPath === target.path
  })
  return index === -1 ? 0 : index
}
