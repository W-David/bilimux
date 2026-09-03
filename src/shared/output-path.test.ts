import { describe, expect, it } from 'vitest'
import { buildOutputLayout, formatPartBadge } from './output-path'

describe('buildOutputLayout', () => {
  it('uses the title as a single file for a one-part ugc video', () => {
    expect(
      buildOutputLayout({
        title: '独立短片',
        part: '独立短片',
        page: 1,
        pages: 1,
        kind: 'ugc'
      })
    ).toEqual({ directory: null, fileStem: '独立短片' })
  })

  it('puts multi-part ugc videos under a title directory as 第nP', () => {
    expect(
      buildOutputLayout({
        title: '教程合集',
        part: '环境安装',
        page: 2,
        pages: 5,
        kind: 'ugc'
      })
    ).toEqual({ directory: '教程合集', fileStem: '第2P 环境安装' })
  })

  it('puts bangumi episodes under the season directory as 第n话', () => {
    expect(
      buildOutputLayout({
        title: '某科学的超电磁炮',
        part: '电磁炮',
        page: 1,
        pages: 24,
        kind: 'ogv',
        ogvCategory: 'bangumi'
      })
    ).toEqual({ directory: '某科学的超电磁炮', fileStem: '第1话 电磁炮' })
  })

  it('puts cinema episodes under the series directory as 第n集', () => {
    expect(
      buildOutputLayout({
        title: '某国产剧',
        part: '开端',
        page: 3,
        pages: 12,
        kind: 'ogv',
        ogvCategory: 'cinema'
      })
    ).toEqual({ directory: '某国产剧', fileStem: '第3集 开端' })
  })

  it('still uses a season folder for a single-episode bangumi', () => {
    expect(
      buildOutputLayout({
        title: '剧场版',
        part: '',
        page: 1,
        pages: 1,
        kind: 'ogv',
        ogvCategory: 'bangumi'
      })
    ).toEqual({ directory: '剧场版', fileStem: '第1话' })
  })

  it('does not repeat the 第nP label when part already matches', () => {
    expect(
      buildOutputLayout({
        title: '教程合集',
        part: '第2P',
        page: 2,
        pages: 5,
        kind: 'ugc'
      })
    ).toEqual({ directory: '教程合集', fileStem: '第2P' })
  })
})

describe('formatPartBadge', () => {
  it('returns empty for a single ugc video', () => {
    expect(formatPartBadge({ title: 'a', page: 1, pages: 1, kind: 'ugc' })).toBe('')
  })

  it('labels ugc parts as 第nP', () => {
    expect(formatPartBadge({ title: 'a', page: 2, pages: 3, kind: 'ugc' })).toBe('第2P')
  })

  it('labels bangumi as 第n话 and cinema as 第n集', () => {
    expect(formatPartBadge({ title: 'a', page: 1, pages: 1, kind: 'ogv', ogvCategory: 'bangumi' })).toBe('第1话')
    expect(formatPartBadge({ title: 'a', page: 4, pages: 8, kind: 'ogv', ogvCategory: 'cinema' })).toBe('第4集')
  })
})
