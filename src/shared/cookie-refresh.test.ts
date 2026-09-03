import { describe, expect, it } from 'vitest'
import { parseRefreshCsrf } from './cookie-refresh'

describe('parseRefreshCsrf', () => {
  it('reads the 1-name div from the correspond HTML', () => {
    const html = `<!DOCTYPE html><html><body><div id="1-name">b0cc8411ded2f9db2cff2edb3123acac</div></body></html>`
    expect(parseRefreshCsrf(html)).toBe('b0cc8411ded2f9db2cff2edb3123acac')
  })

  it('returns null when the token node is missing', () => {
    expect(parseRefreshCsrf('<html><body>404</body></html>')).toBeNull()
  })
})
