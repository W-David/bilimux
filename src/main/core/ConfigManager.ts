import { ConfigOptions, DownloadConfigOptions, UserStore } from '@shared/types'
import Store from 'electron-store'
import { app } from 'electron/main'
import path from 'node:path'
import { CONVERT_DIR_NAME, DOWNLOAD_DIR_NAME, OUTPUT_DIR_NAME } from '../config/constants'
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
  }

  genDefaultConfig() {
    // 系统视频路径
    const downloadPath = app.getPath('videos')
    // 默认哔哩哔哩缓存路径
    const cachePath = path.resolve(downloadPath, './bilibili')
    // 默认转换输出路径
    const convertOutputDir = path.join(cachePath, OUTPUT_DIR_NAME, CONVERT_DIR_NAME)
    // 默认下载输出路径
    const downloadOutputDir = path.join(cachePath, OUTPUT_DIR_NAME, DOWNLOAD_DIR_NAME)
    // 默认 mp4box 路径
    const gpacBinPath = getEngineBinPath(this.context.platform)

    const defaultConvertConfig: Required<ConfigOptions> = {
      cachePath,
      outputDir: convertOutputDir,
      gpacBinPath,
      forceTransform: false,
      forceComposition: false,
      genConfig: false
    }

    const defaultDownloadConfig: Required<DownloadConfigOptions> = {
      outputDir: downloadOutputDir
    }

    const defaultConfig: Required<UserStore> = {
      'user-cookie': '',
      'user-info': null,
      'favorites-data': null,
      'convert-config': defaultConvertConfig,
      'download-config': defaultDownloadConfig,
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

    const convertConfig = this.store.get('convert-config')
    const cachePath = convertConfig?.cachePath || this.defaultConfig['convert-config'].cachePath
    const oldOutputDir = path.join(cachePath, OUTPUT_DIR_NAME)

    // 迁移旧输出目录结构：output → output/convert
    if (convertConfig && convertConfig.outputDir === oldOutputDir) {
      this.store.set('convert-config', {
        ...convertConfig,
        outputDir: path.join(oldOutputDir, CONVERT_DIR_NAME)
      })
      logger.info('[Config] 已迁移视频转换输出目录:', path.join(oldOutputDir, CONVERT_DIR_NAME))
    }

    // 初始化下载配置（老版本没有该配置项）
    if (!this.store.store['download-config']) {
      this.store.set('download-config', {
        outputDir: path.join(cachePath, OUTPUT_DIR_NAME, DOWNLOAD_DIR_NAME)
      })
      logger.info('[Config] 已初始化视频下载输出目录:', path.join(cachePath, OUTPUT_DIR_NAME, DOWNLOAD_DIR_NAME))
    }
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
    this.#unsubscribe.forEach(fn => fn())
  }
}
