import { RegType, VideoType } from '@shared/types'

export const REG_TYPE_MAP: RegType[] = [
  {
    reg: new RegExp(/.*\/video\//, 'i'),
    type: 'BV'
  },
  {
    reg: new RegExp(/.*\/list\//, 'i'),
    type: 'BVS'
  },
  {
    reg: new RegExp(/.*\/festival\//, 'i'),
    type: 'FESTIVAl'
  },
  {
    reg: new RegExp(/.*\/bangumi\/play\//, 'i'),
    type: 'BANGUMI'
  },
  {
    reg: new RegExp(/.*\/cheese\/play\//, 'i'),
    type: 'CHEESE'
  }
]

export const parseVideoType = (url: string): [VideoType | null, string | null] => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const regType = REG_TYPE_MAP.find(item => item.reg.test(url))
    if (!regType) {
      return [null, '不支持的视频链接']
    }
    return [regType.type, null]
  } else {
    return [null, '不受支持的协议']
  }
}

export const parseHtml = (html: string, type: VideoType) => {
  if (!type) {
    return []
  }
  const __INITIAL_STATE__ = html.match(/<script>window\.__INITIAL_STATE__=([\s\S]*?);\(function\(\).*?<\/script>/)
  const __playinfo__ = html.match(/<script>window\.__playinfo__=([\s\S]*?)<\/script>/)
  if (__INITIAL_STATE__ && __playinfo__) {
    return [__INITIAL_STATE__[1], __playinfo__[1]]
  }
  return []
}

export const resolveVideoMetaData = (html: string, type: VideoType): [string[] | null, string | null] => {
  const data = parseHtml(html, type)
  if (data.length === 0) {
    return [null, '未获取到有效的视频数据']
  }
  return [data, null]
}
