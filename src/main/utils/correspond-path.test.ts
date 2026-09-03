import { describe, expect, it } from 'vitest'
import { getCorrespondPath } from './correspond-path'

describe('getCorrespondPath', () => {
  it('returns a 256-char hex string (1024-bit RSA-OAEP)', () => {
    const hex = getCorrespondPath(1_684_468_084_078)
    expect(hex).toMatch(/^[0-9a-f]+$/)
    expect(hex).toHaveLength(256)
  })

  it('uses OAEP random padding so the same timestamp is not deterministic', () => {
    const ts = Date.now()
    expect(getCorrespondPath(ts)).not.toBe(getCorrespondPath(ts))
  })
})
