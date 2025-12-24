import { EngineBinMap } from './types'

// 常量定义
export const M4S_SUFFIX = '.m4s'
export const MP4_SUFFIX = '.mp4'
export const MP3_SUFFIX = '.mp3'
export const OUTPUT_DIR_NAME = 'output'
export const PLAYURL_FILE_NAME = '.playurl'
export const VIDEO_INFO_FILE_NAME = 'videoInfo.json'
export const CONF_FILE_NAME = '.bilimux-conf.json'

// mp4box 可执行文件名
export const ENGINE_BIN_MAP: EngineBinMap = {
  darwin: 'MP4Box',
  win32: 'MP4Box.exe',
  linux: 'MP4Box'
}
