import Store from 'electron-store'
import { app } from 'electron/main'
import path from 'node:path'
import { OUTPUT_DIR_NAME } from '../config/constants'
import { ConfigOptions, UserStore } from '../config/types'
import { getEngineBinPath } from '../utils'
import Context from './Context'
import logger from './Logger'

export default class ConfigManager {
  context: Context
  defaultConfig: Required<UserStore>
  store: Store<UserStore>
  #unsubscribe: Array<() => void>

  constructor(context: Context) {
    this.context = context
    this.#unsubscribe = []
    this.defaultConfig = this.genDefaultConfig()
    this.store = new Store<UserStore>({
      defaults: this.defaultConfig,
      watch: true
    })
    this.fixConfig()
    logger.info(this.constructor.name, 'inited')
  }

  genDefaultConfig(): UserStore {
    const downloadPath = app.getPath('videos')
    // 默认哔哩哔哩缓存路径
    const cachePath = path.resolve(downloadPath, './bilibili')
    // 默认输出路径
    const outputDir = path.join(cachePath, OUTPUT_DIR_NAME)
    // 默认 mp4box 路径
    const gpacBinPath = getEngineBinPath(this.context.platform)

    const defaultConvertConfig: Required<ConfigOptions> = {
      cachePath,
      outputDir,
      gpacBinPath,
      forceTransform: false,
      forceComposition: false,
      genConfig: false
    }

    const defaultConfig: Required<UserStore> = {
      'convert-config': defaultConvertConfig,
      'open-at-login': false,
      'auto-hide-window': false,
      'bind-close-to-hide': true,
      'log-level': 'verbose'
    }
    return defaultConfig
  }

  fixConfig() {
    const { openAtLogin } = app.getLoginItemSettings()
    this.store.set('open-at-login', openAtLogin)
  }

  getStore(): UserStore {
    return this.store.store
  }

  onChangedListener(...params: Parameters<Store<UserStore>['onDidChange']>): void {
    const [key, callback] = params
    const unsubscribe = this.store.onDidChange(key, (nv, ov) => {
      logger.info('检测到配置变化:', `${key}: ${ov} => ${nv}`)
      callback(nv, ov)
    })
    this.#unsubscribe.push(unsubscribe)
  }

  removeAllChangedListener(): void {
    logger.info(this.constructor.name, 'removeAllChangedListener')
    this.#unsubscribe.forEach(fn => fn())
  }
}
