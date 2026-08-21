/* eslint-disable */
/**
 * 批量修复 VSCode Tailwind CSS 插件的「未知 / 可简化」类名警告。
 *
 * 会改：
 * 1. shadcn 占位类（cn-*）和明显笔误
 * 2. 能写成标准工具类的任意值（px / 字号 / 圆角 / 边框）
 * 3. 与主题色完全一致的 hex
 * 4. 自定义类登记进 known-classes.css / @utility，让插件认得出
 *
 * 运行：node scripts/fix-tailwind-warnings.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const cwd = process.cwd()
const rendererRoot = join(cwd, 'src/renderer/src')
const baseCssPath = join(rendererRoot, 'styles/base.css')
const tailwindCssPath = join(rendererRoot, 'styles/tailwind.css')
const knownCssPath = join(rendererRoot, 'styles/known-classes.css')

/** from → to；to 为空字符串表示删除该 token */
const REPLACEMENTS = new Map([
  ['cn-font-heading', 'font-heading'],
  ['cn-menu-target', ''],
  ['cn-menu-translucent', ''],
  ['transform-all', 'transition-all']
])

/** 与 base.css .dark 完全一致的颜色 → 主题 token（只替换 bg/text/border/ring） */
const THEME_HEX = {
  '#181818': 'background',
  '#1f1f1f': 'secondary',
  '#e5e7eb': 'foreground'
}

const TEXT_SIZES = {
  '0.5625rem': 'text-3xs',
  '9px': 'text-3xs',
  '0.625rem': 'text-2xs',
  '10px': 'text-2xs',
  '0.6875rem': 'text-caption',
  '11px': 'text-caption',
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

/** --radius=0.625rem → sm6 / md8 / lg10 / xl14；其余用 v4 默认 */
const RADIUS_SIZES = {
  '2px': 'xs',
  '6px': 'sm',
  '8px': 'md',
  '10px': 'lg',
  '14px': 'xl',
  '16px': '2xl',
  '24px': '3xl',
  '32px': '4xl'
}

const SPACING_PROPS =
  'top|right|bottom|left|inset|inset-x|inset-y|start|end|w|h|size|min-w|max-w|min-h|max-h|p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y|scroll-m|scroll-mx|scroll-my|scroll-p|scroll-px|scroll-py'

const COLOR_PROPS = 'bg|text|border|border-t|border-r|border-b|border-l|border-x|border-y|ring|from|to|via|fill|stroke'

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return /\.(vue|ts|css)$/.test(entry.name) ? [full] : []
  })
}

function rel(file) {
  return relative(cwd, file)
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function replaceToken(source, from, to) {
  const token = escapeRegex(from)
  if (to) {
    return source.replace(new RegExp(`(?<![\\w-])${token}(?![\\w-])`, 'g'), to)
  }
  return source
    .replace(new RegExp(` ${token} `, 'g'), ' ')
    .replace(new RegExp(` ${token}(?=[\\s'"])`, 'g'), '')
    .replace(new RegExp(`(?<=[\\s'"])${token} `, 'g'), '')
    .replace(new RegExp(`(?<![\\w-])${token}(?![\\w-])`, 'g'), '')
}

function convertThemeHex(source) {
  for (const [hex, token] of Object.entries(THEME_HEX)) {
    source = source.replace(
      new RegExp(`(?<![\\w-])((?:[\\w-[\\]]+:)*?)(${COLOR_PROPS})-\\[${hex}\\](!?)(?![\\w-])`, 'gi'),
      (_, variant, prop, important) => `${variant}${prop}-${token}${important}`
    )
  }
  return source
}

function convertArbitrary(source) {
  source = source.replace(
    new RegExp(`(?<![\\w-])((?:${SPACING_PROPS})-)\\[(-?)(\\d+(?:\\.\\d+)?)px\\](?![\\w-])`, 'g'),
    (match, name, negative, value) => {
      if (parseFloat(value) % 1 !== 0) return match
      const number = parseFloat(value) / 4
      const normalized = Number.isInteger(number) ? String(number) : String(Math.round(number * 100) / 100)
      return `${negative ? '-' : ''}${name}${normalized}`
    }
  )

  source = source.replace(/(?<![\w-])(border(?:-[trblxy])?)-\[1px\](?![\w-])/g, '$1')
  source = source.replace(/(?<![\w-])(border(?:-[trblxy])?)-\[2px\](?![\w-])/g, '$1-2')
  source = source.replace(/(?<![\w-])(border(?:-[trblxy])?)-\[4px\](?![\w-])/g, '$1-4')
  source = source.replace(/(?<![\w-])(border(?:-[trblxy])?)-\[8px\](?![\w-])/g, '$1-8')

  for (const [from, to] of Object.entries(TEXT_SIZES)) {
    source = source.split(`text-[${from}]`).join(to)
  }

  for (const [from, to] of Object.entries(RADIUS_SIZES)) {
    source = source.replace(
      new RegExp(`(?<![\\w-])rounded(?:-([trblse]{1,2}))?-\\[${from}\\](?![\\w-])`, 'g'),
      (_match, side) => `rounded${side ? `-${side}` : ''}-${to}`
    )
  }

  source = source.replace(/(?<![\w-])h-\[var\(--headbar-height\)\](?![\w-])/g, 'h-headbar')

  return source
}

function collectClassTokens(source) {
  const tokens = new Set()
  const take = chunk => {
    String(chunk)
      .split(/\s+/)
      .forEach(token => {
        token = token.trim()
        if (token) tokens.add(token)
      })
  }

  for (const match of source.matchAll(/(?:^|\s)class="([^"]*)"/g)) take(match[1])
  for (const match of source.matchAll(/:class="([^"]*)"/g)) {
    for (const str of match[1].matchAll(/['"`]([^'"`]+)['"`]/g)) take(str[1])
  }
  for (const match of source.matchAll(/\b(?:cn|cva)\(\s*([`'"])([\s\S]*?)\1/g)) take(match[2])
  return tokens
}

function collectVueStyleClasses(source) {
  const names = new Set()
  for (const block of source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) {
    for (const match of block[1].matchAll(/\.(-?[_a-zA-Z]+[\w-]*)/g)) {
      names.add(match[1])
    }
  }
  return names
}

function collectUtilities(css) {
  const names = new Set()
  for (const match of css.matchAll(/@utility\s+([\w-]+)/g)) names.add(match[1])
  return names
}

function applySourceFixes(source) {
  let next = source
  for (const [from, to] of REPLACEMENTS) {
    next = replaceToken(next, from, to)
  }
  next = convertThemeHex(next)
  next = convertArbitrary(next)
  return next
}

function ensureSnippet(file, marker, snippet, insertAfter) {
  const source = readFileSync(file, 'utf8')
  if (source.includes(marker)) return false
  if (insertAfter && source.includes(insertAfter)) {
    writeFileSync(file, source.replace(insertAfter, `${insertAfter}\n${snippet}`))
  } else {
    writeFileSync(file, `${source.trimEnd()}\n\n${snippet}\n`)
  }
  return true
}

const files = walk(rendererRoot)
let changedFiles = 0

for (const file of files) {
  if (file === knownCssPath) continue
  const source = readFileSync(file, 'utf8')
  const next = applySourceFixes(source)
  if (next !== source) {
    writeFileSync(file, next)
    changedFiles += 1
    console.log(`replaced: ${rel(file)}`)
  }
}

if (
  ensureSnippet(
    baseCssPath,
    '--text-2xs:',
    `  --text-3xs: 9px;\n  --text-3xs--line-height: 1;\n  --text-2xs: 10px;\n  --text-2xs--line-height: 1;\n  --text-caption: 11px;\n  --text-caption--line-height: 1;`,
    '  --font-heading: var(--font-sans);'
  )
) {
  console.log('added --text-3xs / --text-2xs / --text-caption to styles/base.css')
}

if (
  ensureSnippet(
    baseCssPath,
    '--text-caption:',
    `  --text-caption: 11px;\n  --text-caption--line-height: 1;`,
    '  --text-2xs--line-height: 1;'
  )
) {
  console.log('added --text-caption to styles/base.css')
}

const utilitiesToEnsure = [['h-headbar', '@utility h-headbar {\n  height: var(--headbar-height);\n}']]

let tailwindCss = readFileSync(tailwindCssPath, 'utf8')
let tailwindChanged = false
for (const [name, snippet] of utilitiesToEnsure) {
  if (!new RegExp(`@utility\\s+${escapeRegex(name)}\\b`).test(tailwindCss)) {
    tailwindCss = `${tailwindCss.trimEnd()}\n\n${snippet}\n`
    tailwindChanged = true
    console.log(`added @utility ${name} to styles/tailwind.css`)
  }
}
if (tailwindChanged) writeFileSync(tailwindCssPath, tailwindCss)

let baseCss = readFileSync(baseCssPath, 'utf8')
const draggableBlock =
  /\/\*[\s\S]*?\*\/\s*\.draggable\s*\{[\s\S]*?\}\s*\.no-drag\s*\{[\s\S]*?\}|\.draggable\s*\{[\s\S]*?\}\s*\.no-drag\s*\{[\s\S]*?\}/
if (baseCss.includes('.draggable {') && !readFileSync(tailwindCssPath, 'utf8').includes('@utility draggable')) {
  const match = baseCss.match(draggableBlock)
  const bodyDraggable = baseCss.match(/\.draggable\s*\{([\s\S]*?)\}/)
  const bodyNoDrag = baseCss.match(/\.no-drag\s*\{([\s\S]*?)\}/)
  if (bodyDraggable && bodyNoDrag) {
    writeFileSync(
      tailwindCssPath,
      `${readFileSync(tailwindCssPath, 'utf8').trimEnd()}\n\n@utility draggable {${bodyDraggable[1]}}\n\n@utility no-drag {${bodyNoDrag[1]}}\n`
    )
    baseCss = baseCss.replace(match ? match[0] : '', '').replace(/\n{3,}/g, '\n\n')
    writeFileSync(baseCssPath, baseCss.trimEnd() + '\n')
    console.log('moved .draggable / .no-drag to @utility')
  }
}

if (!readFileSync(baseCssPath, 'utf8').includes("import './known-classes.css'")) {
  const nextBase = readFileSync(baseCssPath, 'utf8').replace(
    "@import './tailwind.css';",
    "@import './tailwind.css';\n@import './known-classes.css';"
  )
  writeFileSync(baseCssPath, nextBase)
  console.log('imported styles/known-classes.css')
}

const vueStyleClasses = new Set()
for (const file of walk(rendererRoot)) {
  if (!file.endsWith('.vue')) continue
  for (const name of collectVueStyleClasses(readFileSync(file, 'utf8'))) {
    if (name === 'dark' || name.startsWith('v-')) continue
    vueStyleClasses.add(name)
  }
}

const knownUtilities = collectUtilities(
  `${readFileSync(tailwindCssPath, 'utf8')}\n${readFileSync(baseCssPath, 'utf8')}`
)
const stubNames = [...new Set([...vueStyleClasses, 'toaster'])].filter(name => !knownUtilities.has(name)).sort()

const knownCss = `/* 由 scripts/fix-tailwind-warnings.mjs 生成：登记非工具类，避免 Tailwind 插件报未知类 */\n@layer components {\n${stubNames
  .map(name => `  .${name} {\n  }\n`)
  .join('\n')}}\n`
writeFileSync(knownCssPath, knownCss)
console.log(`wrote ${stubNames.length} known class stub(s) to styles/known-classes.css`)

const leftover = new Map()
const leftoverArbitrary = new Map()
for (const file of walk(rendererRoot)) {
  if (file.endsWith('.css')) continue
  const source = readFileSync(file, 'utf8')
  const path = rel(file)
  for (const token of collectClassTokens(source)) {
    if (/^cn-/.test(token) || token === 'transform-all') {
      if (!leftover.has(token)) leftover.set(token, new Set())
      leftover.get(token).add(path)
    }
    if (/(?:text|rounded(?:-[trblse]{1,2})?|h|w|size)-\[\d+(?:px|rem)\]/.test(token)) {
      if (!leftoverArbitrary.has(token)) leftoverArbitrary.set(token, new Set())
      leftoverArbitrary.get(token).add(path)
    }
  }
}

if (leftover.size > 0) {
  console.log('\n仍有占位类 / 笔误，请人工确认：')
  for (const [token, files] of leftover) {
    console.log(`  ${token}  <=  ${[...files].join(', ')}`)
  }
} else {
  console.log('\n未发现残留的 cn-* / transform-all。')
}

if (leftoverArbitrary.size > 0) {
  console.log('\n仍保留的任意值类（无对应标准类，未改）：')
  for (const [token, files] of leftoverArbitrary) {
    console.log(`  ${token}  <=  ${[...files].join(', ')}`)
  }
}

console.log(`\ndone, changed ${changedFiles} file(s)`)
