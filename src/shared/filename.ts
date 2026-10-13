const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i

/** 过滤文件名中的特殊字符，保证跨平台可用（转换与下载共用） */
export function sanitizeFileName(name: string): string {
  if (!name) return 'untitled'

  const sanitized = name
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/</g, '《')
    .replace(/>/g, '》')
    .replace(/\\/g, '#')
    .replace(/"/g, "'")
    .replace(/\//g, '#')
    .replace(/\|/g, '_')
    .replace(/\?/g, '？')
    .replace(/\*/g, '-')
    .replace(/【/g, '[')
    .replace(/】/g, ']')
    .replace(/:/g, '：')
    .replace(/\s+/g, '')
    .replace(/[. ]+$/g, '')
    .trim()

  if (!sanitized) return 'untitled'
  if (WINDOWS_RESERVED_NAMES.test(sanitized)) {
    return `_${sanitized}`
  }
  return sanitized
}
