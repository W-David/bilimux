export type OgvCategory = 'bangumi' | 'cinema'

export type OutputNameInput = {
  title: string
  part?: string
  page: number
  pages: number
  kind?: 'ugc' | 'ogv'
  ogvCategory?: OgvCategory
}

export type OutputLayout = {
  directory: string | null
  fileStem: string
}

function positivePage(page: number): number {
  return Number.isFinite(page) && page > 0 ? Math.trunc(page) : 1
}

function isMultiUgc(input: OutputNameInput): boolean {
  return (input.kind ?? 'ugc') !== 'ogv' && (input.pages > 1 || input.page > 1)
}

function isOgv(input: OutputNameInput): boolean {
  return input.kind === 'ogv'
}

export function partUnit(input: Pick<OutputNameInput, 'kind' | 'ogvCategory'>): 'P' | '话' | '集' {
  if (input.kind === 'ogv' && input.ogvCategory === 'cinema') return '集'
  if (input.kind === 'ogv') return '话'
  return 'P'
}

export function formatPartBadge(input: OutputNameInput): string {
  if (!isOgv(input) && !isMultiUgc(input)) return ''
  return `第${positivePage(input.page)}${partUnit(input)}`
}

function joinLabel(label: string, extra?: string): string {
  const trimmed = extra?.trim() ?? ''
  if (!trimmed || trimmed === label) return label
  return `${label} ${trimmed}`
}

/** 下载产物目录/文件名（尚未做非法字符清洗） */
export function buildOutputLayout(input: OutputNameInput): OutputLayout {
  const title = input.title.trim() || 'untitled'
  const page = positivePage(input.page)

  if (isOgv(input)) {
    const label = `第${page}${partUnit(input)}`
    return {
      directory: title,
      fileStem: joinLabel(label, input.part)
    }
  }

  if (isMultiUgc(input)) {
    const label = `第${page}P`
    return {
      directory: title,
      fileStem: joinLabel(label, input.part)
    }
  }

  return { directory: null, fileStem: title }
}
