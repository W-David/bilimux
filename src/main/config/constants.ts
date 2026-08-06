import { EngineBinMap } from '@shared/types'

// 常量定义
export const M4S_SUFFIX = '.m4s'
export const MP4_SUFFIX = '.mp4'
export const MP3_SUFFIX = '.mp3'
export const OUTPUT_DIR_NAME = 'output'
export const CONVERT_DIR_NAME = 'convert'
export const DOWNLOAD_DIR_NAME = 'download'
export const PLAYURL_FILE_NAME = '.playurl'
export const VIDEO_INFO_FILE_NAME = 'videoInfo.json'
export const CONF_FILE_NAME = '.bilimux-conf.json'

// 域名
export const DOMAIN = 'https://www.bilibili.com'

// mp4box 可执行文件名
export const ENGINE_BIN_MAP: EngineBinMap = {
  darwin: 'MP4Box',
  win32: 'MP4Box.exe',
  linux: 'MP4Box'
}

export const ERROR_CODE = {
  '-1': '应用程序不存在或已被封禁',
  '-2': 'Access key错误',
  '-3': 'API校验密匙错误',
  '-101': '帐号未登陆',
  '-102': '帐号被封停',
  '-103': '积分不足',
  '-104': '硬币不足',
  '-105': '验证码错误',
  '-106': '帐号未激活',
  '-107': '帐号非正式会员或在适应期',
  '-108': '应用沒有存取相应功能的权限',
  '-400': '请求有误',
  '-403': '权限不足',
  '-404': '文档不存在',
  '-500': '服务器内部错误',
  '-503': '调用速度过快'
}
