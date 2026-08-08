/* eslint-disable */
/**
 * 批量修复 VSCode Tailwind CSS 插件的“未知工具类”警告。
 *
 * 当前修复：
 * 1. cn-font-heading -> font-heading（shadcn 生成组件里的占位类名）
 * 2. 确保 base.css 里有 .toaster 声明（样式实际来自 vue-sonner/style.css）
 * 3. 把可以写成标准类的任意值类批量转换，例如：
 *    bottom-[-5px] -> -bottom-1.25、h-[12px] -> h-3、text-[1.25rem] -> text-xl
 *
 * 运行：node scripts/fix-tailwind-warnings.mjs
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const rendererRoot = join(process.cwd(), 'src/renderer/src')
const baseCssPath = join(rendererRoot, 'styles/base.css')

// 已知需要替换的类名
const REPLACEMENTS = new Map([['cn-font-heading', 'font-heading']])

// 有意保留、但不是 Tailwind 工具类的类名
const KNOWN_NON_TAILWIND = new Set(['toaster'])

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : /\.(vue|ts)$/.test(entry.name) ? [full] : []
  })
}

function collectTokens(source) {
  const tokens = new Set()
  for (const match of source.matchAll(/(?:^|\s)class="([^"]*)"/g)) {
    match[1].split(/\s+/).forEach(token => token && tokens.add(token))
  }
  for (const match of source.matchAll(/:class="([^"]*)"/g)) {
    for (const str of match[1].matchAll(/['"`]([^'"`]+)['"`]/g)) {
      str[1].split(/\s+/).forEach(token => token && tokens.add(token))
    }
  }
  return tokens
}

function escapeSelector(token) {
  return token.replace(/[^a-zA-Z0-9_-]/g, char => `\\${char}`)
}

function isUtilityLike(token) {
  return (
    /^[a-z]/.test(token) &&
    token.includes('-') &&
    !token.includes('(') &&
    !token.includes('var(') &&
    !/^(group|peer)\//.test(token)
  )
}

function convertArbitrary(source) {
  // 1) spacing：px 任意值 -> 标准间距（负数前置）
  source = source.replace(
    /(?<![\w-])((?:top|right|bottom|left|inset|inset-x|inset-y|w|h|size|min-w|max-w|min-h|max-h|p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y)-)\[(-?)(\d+(?:\.\d+)?)px\](?![\w-])/g,
    (match, name, negative, value) => {
      // 只转换能整除成 0.25 步进的 px（1px = 0.25），避免 h-[18.4px] 这类误转
      if (parseFloat(value) % 1 !== 0) {
        return match
      }
      const number = parseFloat(value) / 4
      const normalized = Number.isInteger(number) ? String(number) : String(Math.round(number * 100) / 100)
      return `${negative ? '-' : ''}${name}${normalized}`
    }
  )

  // 2) border 宽度
  source = source.replace(/(?<![\w-])(border(?:-[trbl])?)-\[1px\](?![\w-])/g, '$1')
  source = source.replace(/(?<![\w-])(border(?:-[trbl])?)-\[2px\](?![\w-])/g, '$1-2')
  source = source.replace(/(?<![\w-])(border(?:-[trbl])?)-\[4px\](?![\w-])/g, '$1-4')
  source = source.replace(/(?<![\w-])(border(?:-[trbl])?)-\[8px\](?![\w-])/g, '$1-8')

  // 3) 字号：精确匹配 Tailwind v4 命名尺寸
  const textSizes = {
    '0.75rem': 'text-xs',
    '12px': 'text-xs',
    '0.875rem': 'text-sm',
    '14px': 'text-sm',
    '1rem': 'text-base',
    '16px': 'text-base',
    '1.125rem': 'text-lg',
    '18px': 'text-lg',
    '1.25rem': 'text-xl',
    '20px': 'text-xl',
    '1.5rem': 'text-2xl',
    '24px': 'text-2xl',
    '1.875rem': 'text-3xl',
    '30px': 'text-3xl',
    '2.25rem': 'text-4xl',
    '36px': 'text-4xl',
    '3rem': 'text-5xl',
    '48px': 'text-5xl',
    '3.75rem': 'text-6xl',
    '60px': 'text-6xl',
    '4.5rem': 'text-7xl',
    '72px': 'text-7xl',
    '6rem': 'text-8xl',
    '96px': 'text-8xl',
    '8rem': 'text-9xl',
    '128px': 'text-9xl'
  }
  for (const [from, to] of Object.entries(textSizes)) {
    source = source.split(`text-[${from}]`).join(to)
  }

  // 4) 圆角：按当前主题半径换算（--radius=0.625rem => sm6/md8/lg10/xl14，其余用 v4 默认）
  const radiusSizes = {
    '6px': 'sm',
    '8px': 'md',
    '10px': 'lg',
    '14px': 'xl',
    '16px': '2xl',
    '24px': '3xl',
    '32px': '4xl'
  }
  for (const [from, to] of Object.entries(radiusSizes)) {
    source = source.replace(
      new RegExp(`(?<![\\w-])rounded(?:-([trbl]))?-\\[${from}\\](?![\\w-])`, 'g'),
      (match, side) => {
        return `rounded${side ? `-${side}` : ''}-${to}`
      }
    )
  }

  return source
}

const cssFiles = existsSync(join(process.cwd(), 'out/renderer/assets'))
  ? readdirSync(join(process.cwd(), 'out/renderer/assets')).filter(file => file.endsWith('.css'))
  : []
const generatedCss = cssFiles
  .map(file => readFileSync(join(process.cwd(), 'out/renderer/assets', file), 'utf8'))
  .join('\n')

let changedFiles = 0
for (const file of walk(rendererRoot)) {
  const source = readFileSync(file, 'utf8')
  let next = source
  for (const [from, to] of REPLACEMENTS) {
    next = next.split(from).join(to)
  }
  next = convertArbitrary(next)
  if (next !== source) {
    writeFileSync(file, next)
    changedFiles += 1
    console.log(`replaced: ${file.replace(process.cwd() + '/', '')}`)
  }
}

// 确保 .toaster 声明存在
const baseCss = readFileSync(baseCssPath, 'utf8')
if (!baseCss.includes('.toaster')) {
  writeFileSync(
    baseCssPath,
    `${baseCss.trimEnd()}\n\n/* vue-sonner 自带 .toaster 样式，这里仅声明以避免 Tailwind 插件报未知类 */\n.toaster {\n}\n`
  )
  console.log('added .toaster declaration to styles/base.css')
}

// 报告剩余的疑似未知类（需要人工确认，脚本不自动删除）
const remaining = new Map()
for (const file of walk(rendererRoot)) {
  const source = readFileSync(file, 'utf8')
  for (const token of collectTokens(source)) {
    if (KNOWN_NON_TAILWIND.has(token) || !isUtilityLike(token)) continue
    if (generatedCss && !generatedCss.includes(`.${escapeSelector(token)}`)) {
      if (!remaining.has(token)) remaining.set(token, new Set())
      remaining.get(token).add(file.replace(process.cwd() + '/', ''))
    }
  }
}

if (remaining.size > 0) {
  console.log('\n以下类名未在构建产物中找到，请人工确认：')
  for (const [token, files] of remaining) {
    console.log(`  ${token} <= ${[...files].join(', ')}`)
  }
} else {
  console.log('\n未发现其他疑似未知类。')
}

console.log(`\ndone, changed ${changedFiles} file(s)`)
