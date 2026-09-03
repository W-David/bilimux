import { constants, publicEncrypt } from 'node:crypto'

/** B 站 Web Cookie 刷新用 RSA 公钥，见 bili-API-collect docs/login/cookie_refresh.md */
const REFRESH_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDLgd2OAkcGVtoE3ThUREbio0Eg
Uc/prcajMKXvkCKFCWhJYJcLkcM2DKKcSeFpD/j6Boy538YXnR6VhcuUJOhH2x71
nzPjfdTcqMz7djHum0qSZA0AyCBDABUqCrfNgCiJ00Ra7GmRj+YCK1NJEuewlb40
JNrRuoEUXpabUzGB8QIDAQAB
-----END PUBLIC KEY-----`

export function getCorrespondPath(timestamp: number): string {
  const encrypted = publicEncrypt(
    {
      key: REFRESH_PUBLIC_KEY,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    Buffer.from(`refresh_${timestamp}`)
  )
  return encrypted.toString('hex')
}
