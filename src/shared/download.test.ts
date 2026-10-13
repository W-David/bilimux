import { describe, expect, it } from 'vitest'
import { extractDownloadQns, pickDashAudio, pickDashVideo, pickPreferredDownloadQn } from './download'

describe('extractDownloadQns', () => {
  it('unions dash, accept_quality, support_formats and quality then keeps the whitelist', () => {
    expect(
      extractDownloadQns({
        dash: { video: [{ id: 80 }, { id: 125 }] },
        accept_quality: [16, 80, 116, 120],
        support_formats: [{ quality: 112 }],
        quality: 64
      })
    ).toEqual([16, 64, 80, 112, 116, 120])
  })
})

describe('pickPreferredDownloadQn', () => {
  it('picks the highest available qn that does not exceed the preference', () => {
    expect(pickPreferredDownloadQn([16, 64, 80, 116], 80)).toBe(80)
    expect(pickPreferredDownloadQn([16, 64], 80)).toBe(64)
  })

  it('falls back to the highest available when every qn is above preference', () => {
    expect(pickPreferredDownloadQn([112, 116], 80)).toBe(116)
  })
})

describe('pickDashVideo', () => {
  const streams = [
    { id: 80, codecid: 7, baseUrl: 'avc-80' },
    { id: 80, codecid: 12, baseUrl: 'hevc-80' },
    { id: 116, codecid: 7, baseUrl: 'avc-116' }
  ]

  it('does not take dash.video[0]; it prefers requested qn then codec', () => {
    expect(pickDashVideo(streams, 80, 'hevc')?.baseUrl).toBe('hevc-80')
    expect(pickDashVideo(streams, 80, 'avc')?.baseUrl).toBe('avc-80')
  })
})

describe('pickDashAudio', () => {
  it('picks the highest-bandwidth stream with id <= 30280', () => {
    expect(
      pickDashAudio([
        { id: 30216, bandwidth: 64_000, baseUrl: 'aac-64' },
        { id: 30280, bandwidth: 192_000, baseUrl: 'aac-192' }
      ])?.baseUrl
    ).toBe('aac-192')
  })
})
