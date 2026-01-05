/**
 * 遍历函数的配置选项
 */
export interface TraverseOptions {
  /** 是否遍历数组内部？默认为 true */
  traverseArrays?: boolean
  /** 是否遍历 Map/Set 集合？默认为 true */
  traverseCollections?: boolean
  /** 最大递归深度，用于防止潜在的堆栈溢出 */
  maxDepth?: number
  /** 是否包含不可枚举属性 */
  includeNonEnumerable?: boolean
}

/**
 * 路径片段：对象键为字符串，数组索引或 Map 键为数字/其他类型
 */
export type PathSegment = string | number | symbol | unknown

/**
 * 提供给每个节点回调函数的元数据上下文
 */
export interface TraverseContext {
  /** 从根节点到当前节点的路径数组 */
  path: PathSegment[]
  /** 当前节点的嵌套深度 */
  depth: number
  /** 是否为叶子节点（没有子节点或已达深度限制） */
  isLeaf: boolean
  /** 父节点对象的引用 */
  parent: unknown
}

/**
 * 遍历的回调函数签名。
 * 如果返回 `false`，将跳过当前节点及其所有子节点的遍历。
 */
export type TraverseCallback = (key: PathSegment, value: unknown, context: TraverseContext) => boolean | void

/**
 * 工业级对象深度遍历工具。
 * 能够安全地处理循环引用、特殊集合（Map/Set）以及自定义深度限制。
 */
export function traverse<T>(obj: T, callback: TraverseCallback, options: TraverseOptions = {}): void {
  const { traverseArrays = true, traverseCollections = true, maxDepth = 100, includeNonEnumerable = false } = options

  // 使用 WeakSet 存储已访问的对象，用于循环引用保护，且不影响垃圾回收
  const visited = new WeakSet<object>()

  /**
   * 内部递归遍历函数
   */
  function internalTraverse(
    current: unknown,
    key: PathSegment,
    path: PathSegment[],
    depth: number,
    parent: unknown
  ): void {
    // 判断当前节点类型
    const isObject = current !== null && typeof current === 'object'
    const isArray = Array.isArray(current)
    const isCollection = current instanceof Map || current instanceof Set

    // 如果是对象/集合且未达到深度限制，则可能拥有子节点
    const canHaveChildren = isObject && depth < maxDepth
    const isLeaf = !canHaveChildren

    // 1. 执行回调函数
    const shouldContinue = callback(key, current, {
      path,
      depth,
      isLeaf,
      parent
    })

    // 2. 控制流：如果回调返回 false，则停止深入遍历当前分支
    if (shouldContinue === false) return

    // 3. 基本情况：如果不是对象或已是叶子节点，则返回
    if (!isObject || isLeaf) return

    // 4. 循环引用保护
    if (visited.has(current as object)) return
    visited.add(current as object)

    // 5. 针对不同结构的特殊遍历处理

    // 情况 A：数组
    if (isArray) {
      if (!traverseArrays) return
      current.forEach((item, index) => {
        internalTraverse(item, index, [...path, index], depth + 1, current)
      })
      return
    }

    // 情况 B：Map 或 Set 集合
    if (isCollection && traverseCollections) {
      if (current instanceof Map) {
        current.forEach((val, k) => {
          internalTraverse(val, k, [...path, k], depth + 1, current)
        })
      } else if (current instanceof Set) {
        let idx = 0
        current.forEach(val => {
          internalTraverse(val, idx, [...path, idx], depth + 1, current)
          idx++
        })
      }
      return
    }

    // 情况 C：普通对象
    if (includeNonEnumerable) {
      // 包含不可枚举属性和 Symbol 属性
      const props = Object.getOwnPropertyNames(current)
      const symbols = Object.getOwnPropertySymbols(current)
      ;[...props, ...symbols].forEach(k => {
        internalTraverse(current[k], k, [...path, k], depth + 1, current)
      })
    } else {
      // 仅遍历可枚举属性
      Object.entries(current as Record<string, unknown>).forEach(([k, v]) => {
        internalTraverse(v, k, [...path, k], depth + 1, current)
      })
    }
  }

  // 从根节点开始启动遍历
  internalTraverse(obj, '', [], 0, null)
}
