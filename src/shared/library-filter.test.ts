import { describe, expect, it } from 'vitest'
import {
  convertStatusToDownloadFilter,
  downloadFilterStatusFromBadge,
  matchesLibraryDownloadFilter
} from './library-filter'

describe('downloadFilterStatusFromBadge', () => {
  it('maps active to downloading, completed to downloaded, and the rest to undownloaded', () => {
    expect(downloadFilterStatusFromBadge({ status: 'active' })).toBe('downloading')
    expect(downloadFilterStatusFromBadge({ status: 'completed' })).toBe('downloaded')
    expect(downloadFilterStatusFromBadge({ status: 'idle' })).toBe('undownloaded')
    expect(downloadFilterStatusFromBadge({ status: 'partial' })).toBe('undownloaded')
  })
})

describe('matchesLibraryDownloadFilter', () => {
  it('keeps every item when the filter is all', () => {
    expect(matchesLibraryDownloadFilter('all', 'downloaded')).toBe(true)
    expect(matchesLibraryDownloadFilter('all', 'undownloaded')).toBe(true)
    expect(matchesLibraryDownloadFilter('all', 'downloading')).toBe(true)
  })

  it('keeps only the selected status otherwise', () => {
    expect(matchesLibraryDownloadFilter('downloaded', 'downloaded')).toBe(true)
    expect(matchesLibraryDownloadFilter('downloaded', 'undownloaded')).toBe(false)
    expect(matchesLibraryDownloadFilter('downloading', 'downloading')).toBe(true)
    expect(matchesLibraryDownloadFilter('undownloaded', 'downloading')).toBe(false)
  })
})

describe('convertStatusToDownloadFilter', () => {
  it('treats converting as downloading and finished mux as downloaded', () => {
    expect(convertStatusToDownloadFilter('importing')).toBe('downloading')
    expect(convertStatusToDownloadFilter('writing')).toBe('downloading')
    expect(convertStatusToDownloadFilter('success')).toBe('downloaded')
    expect(convertStatusToDownloadFilter('skipped')).toBe('downloaded')
    expect(convertStatusToDownloadFilter('scanned')).toBe('undownloaded')
    expect(convertStatusToDownloadFilter('fail')).toBe('undownloaded')
  })
})
