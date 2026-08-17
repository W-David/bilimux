export const INVOKE_CHANNELS = [
  'get-preference',
  'get-app-version',
  'open-file-dialog',
  'open-path',
  'open-folder',
  'open-log-file',
  'clear-log-file',
  'start:process',
  'convert:prescan',
  'check-for-update',
  'download-update',
  'quit-and-install',
  'check-engine',
  'get-cookie',
  'logout',
  'convert:history:list',
  'convert:history:remove',
  'convert:history:clear',
  'download:video',
  'download:pause',
  'download:resume',
  'download:cancel',
  'download:history:list',
  'download:history:get',
  'download:history:remove',
  'download:history:clear',
  'persist-cookie',
  'http-get-video-metadata',
  'http-get'
] as const

export const SEND_CHANNELS = ['save-preference', 'reset-preference'] as const

export const RECEIVE_CHANNELS = [
  'process:start',
  'process:ready',
  'process:broke',
  'process:success',
  'process:item:start',
  'process:item:progress',
  'process:item:end',
  'download:item:start',
  'download:item:progress',
  'download:item:end',
  'fetch-preference',
  'update:checking',
  'update:available',
  'update:manual-download',
  'update:not-available',
  'update:error',
  'update:progress',
  'update:downloaded',
  'convert:prescan:done'
] as const

export type InvokeChannel = (typeof INVOKE_CHANNELS)[number]
export type SendChannel = (typeof SEND_CHANNELS)[number]
export type ReceiveChannel = (typeof RECEIVE_CHANNELS)[number]

const INVOKE_SET = new Set<string>(INVOKE_CHANNELS)
const SEND_SET = new Set<string>(SEND_CHANNELS)
const RECEIVE_SET = new Set<string>(RECEIVE_CHANNELS)

export function isInvokeChannel(channel: string): channel is InvokeChannel {
  return INVOKE_SET.has(channel)
}

export function isSendChannel(channel: string): channel is SendChannel {
  return SEND_SET.has(channel)
}

export function isReceiveChannel(channel: string): channel is ReceiveChannel {
  return RECEIVE_SET.has(channel)
}
