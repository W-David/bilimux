import { describe, expect, it } from 'vitest'
import {
  convertStatusToCacheFilter,
  DEFAULT_LIBRARY_CACHE_FILTER,
  isLibraryCacheFilter,
  LIBRARY_CACHE_FILTERS,
  matchesLibraryCacheFilter
} from './library-filter'

describe('LIBRARY_CACHE_FILTERS', () => {
  it('defaults to all, then completed, then pending', () => {
    expect(DEFAULT_LIBRARY_CACHE_FILTER).toBe('all')
    expect(LIBRARY_CACHE_FILTERS.map(option => option.value)).toEqual(['all', 'downloaded', 'undownloaded'])
    expect(LIBRARY_CACHE_FILTERS.map(option => option.label)).toEqual(['全部', '已完成', '待转换'])
  })

  it('accepts only known filter values', () => {
    expect(isLibraryCacheFilter('all')).toBe(true)
    expect(isLibraryCacheFilter('downloaded')).toBe(true)
    expect(isLibraryCacheFilter('undownloaded')).toBe(true)
    expect(isLibraryCacheFilter('downloading')).toBe(false)
    expect(isLibraryCacheFilter('')).toBe(false)
  })
})

describe('matchesLibraryCacheFilter', () => {
  it('keeps every item when the filter is all', () => {
    expect(matchesLibraryCacheFilter('all', 'downloaded')).toBe(true)
    expect(matchesLibraryCacheFilter('all', 'undownloaded')).toBe(true)
  })

  it('keeps only the selected status otherwise', () => {
    expect(matchesLibraryCacheFilter('downloaded', 'downloaded')).toBe(true)
    expect(matchesLibraryCacheFilter('downloaded', 'undownloaded')).toBe(false)
    expect(matchesLibraryCacheFilter('undownloaded', 'undownloaded')).toBe(true)
    expect(matchesLibraryCacheFilter('undownloaded', 'downloaded')).toBe(false)
  })
})

describe('convertStatusToCacheFilter', () => {
  it('treats finished mux as completed and the rest as pending', () => {
    expect(convertStatusToCacheFilter('success')).toBe('downloaded')
    expect(convertStatusToCacheFilter('skipped')).toBe('downloaded')
    expect(convertStatusToCacheFilter('importing')).toBe('undownloaded')
    expect(convertStatusToCacheFilter('writing')).toBe('undownloaded')
    expect(convertStatusToCacheFilter('scanned')).toBe('undownloaded')
    expect(convertStatusToCacheFilter('fail')).toBe('undownloaded')
  })
})
