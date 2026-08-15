export const DOWNLOAD_QN_VALUES = [16, 32, 64, 80, 112, 116, 120] as const
export type DownloadQn = (typeof DOWNLOAD_QN_VALUES)[number]

export const DOWNLOAD_CODEC_VALUES = ['avc', 'hevc', 'av1'] as const
export type DownloadCodecPref = (typeof DOWNLOAD_CODEC_VALUES)[number]

export const DOWNLOAD_QN_OPTIONS: { qn: DownloadQn; label: string }[] = [
  { qn: 16, label: '360P' },
  { qn: 32, label: '480P' },
  { qn: 64, label: '720P' },
  { qn: 80, label: '1080P' },
  { qn: 112, label: '1080P+' },
  { qn: 116, label: '1080P 60帧' },
  { qn: 120, label: '4K' }
]

export const DOWNLOAD_CODEC_OPTIONS: { value: DownloadCodecPref; label: string }[] = [
  { value: 'avc', label: 'AVC（兼容优先）' },
  { value: 'hevc', label: 'HEVC' },
  { value: 'av1', label: 'AV1' }
]

export const CODEC_ID = {
  avc: 7,
  hevc: 12,
  av1: 13
} as const

export type DashMedia = {
  id?: number
  codecid?: number
  bandwidth?: number
  baseUrl?: string
  base_url?: string
  backupUrl?: string[]
  backup_url?: string[]
}

export function downloadTaskId(bvid: string, cid: number): string {
  return `${bvid}:${cid}`
}

export function clampDownloadQn(value: unknown): DownloadQn {
  const n = Number(value)
  return (DOWNLOAD_QN_VALUES as readonly number[]).includes(n) ? (n as DownloadQn) : 80
}

export function clampDownloadCodec(value: unknown): DownloadCodecPref {
  return (DOWNLOAD_CODEC_VALUES as readonly string[]).includes(String(value)) ? (value as DownloadCodecPref) : 'avc'
}

export function dashMediaUrl(stream: DashMedia): string | undefined {
  return stream.baseUrl || stream.base_url
}

export function dashMediaBackups(stream: DashMedia): string[] {
  return stream.backupUrl || stream.backup_url || []
}

export function codecPreferenceOrder(pref: DownloadCodecPref): number[] {
  if (pref === 'hevc') return [CODEC_ID.hevc, CODEC_ID.avc, CODEC_ID.av1]
  if (pref === 'av1') return [CODEC_ID.av1, CODEC_ID.hevc, CODEC_ID.avc]
  return [CODEC_ID.avc, CODEC_ID.hevc, CODEC_ID.av1]
}

export function pickDashVideo(videos: DashMedia[], qn: number, codec: DownloadCodecPref): DashMedia | undefined {
  const usable = videos.filter(item => dashMediaUrl(item) && typeof item.id === 'number')
  if (usable.length === 0) return undefined

  const order = codecPreferenceOrder(codec)
  const codecRank = (codecid?: number): number => {
    const index = order.indexOf(codecid ?? -1)
    return index === -1 ? order.length : index
  }

  const atOrBelow = usable.filter(item => (item.id ?? 0) <= qn)
  const pool = atOrBelow.length > 0 ? atOrBelow : usable

  return [...pool].sort((a, b) => {
    const qnDiff = (b.id ?? 0) - (a.id ?? 0)
    if (qnDiff !== 0) return qnDiff
    return codecRank(a.codecid) - codecRank(b.codecid)
  })[0]
}

/** 优先普通 AAC（id <= 30280），避开杜比/Hi-Res */
export function pickDashAudio(audios: DashMedia[]): DashMedia | undefined {
  const usable = audios.filter(item => dashMediaUrl(item))
  if (usable.length === 0) return undefined
  const regular = usable.filter(item => (item.id ?? 0) > 0 && (item.id ?? 0) <= 30280)
  const pool = regular.length > 0 ? regular : usable
  return [...pool].sort((a, b) => (b.bandwidth ?? 0) - (a.bandwidth ?? 0))[0]
}
