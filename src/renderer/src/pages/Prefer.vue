<template>
  <div class="mx-auto h-full w-full flex flex-col gap-4 pt-4 text-sm">
    <div class="min-h-0 flex-1 overflow-y-auto px-6">
      <Tabs v-model="activeTabId">
        <TabsList>
          <TabsTrigger
            v-for="tab in TABS"
            :key="tab.id"
            :value="tab.id">
            {{ tab.name }}
          </TabsTrigger>
        </TabsList>

        <TabsContent :value="TABS[0].id">
          <div class="flex flex-col gap-4 py-4">
            <div class="flex items-center justify-between">
              <label class="font-normal">开机自启</label>
              <Switch v-model="preference['open-at-login']" />
            </div>
            <div class="flex items-center justify-between">
              <label class="font-normal">失焦自动隐藏窗口</label>
              <Switch v-model="preference['auto-hide-window']" />
            </div>
            <div class="flex items-center justify-between">
              <label class="font-normal">关闭时隐藏到托盘</label>
              <Switch v-model="preference['bind-close-to-hide']" />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <label class="font-normal">日志等级</label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <span
                        class="ml-2 inline-block cursor-pointer hover:text-pink-400"
                        @click="openLog">
                        <ExternalLinkIcon class="size-3" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="right">查看日志文件</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <ToggleGroup
                v-model="preference['log-level']"
                type="single"
                size="sm">
                <ToggleGroupItem
                  v-for="opt in logLevelOptions"
                  :key="opt"
                  :value="opt">
                  {{ opt }}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </TabsContent>

        <TabsContent :value="TABS[1].id">
          <div class="flex flex-col gap-4 py-4">
            <!-- 当前登录用户信息展示 -->
            <div
              v-if="currentUserInfo"
              class="flex items-center gap-3 rounded-xl bg-gray-800/40 p-3 ring-1 ring-white/5">
              <Avatar
                v-if="userFace"
                size="lg">
                <AvatarImage
                  :src="safeCover(userFace)"
                  alt="" />
                <AvatarFallback>{{ (userName || 'Bili').slice(0, 1) }}</AvatarFallback>
              </Avatar>
              <Avatar
                v-else
                size="lg">
                <AvatarFallback>{{ (userName || 'Bili').slice(0, 1) }}</AvatarFallback>
              </Avatar>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span
                    class="truncate text-base font-black"
                    :class="
                      nicknameStyle
                        ? 'text-[#f6f6f6]'
                        : 'from-pink-400 to-sky-400 bg-linear-to-r bg-clip-text text-transparent'
                    "
                    :style="nicknameStyle">
                    {{ userName || 'Bili' }}
                  </span>
                  <span
                    v-if="userLevel !== undefined"
                    class="shrink-0 rounded-sm bg-pink-400/15 px-1.5 py-0.5 text-[10px] text-pink-400 font-bold">
                    LV{{ userLevel }}
                  </span>
                  <span
                    v-if="isVip"
                    class="shrink-0 rounded-sm bg-violet-400/15 px-1.5 py-0.5 text-[10px] text-violet-300 font-bold">
                    {{ vipLabel }}
                  </span>
                  <span
                    v-if="isSeniorMember"
                    class="shrink-0 rounded-sm bg-sky-400/15 px-1.5 py-0.5 text-[10px] text-sky-300 font-bold">
                    硬核会员
                  </span>
                </div>
                <div
                  v-if="userCoins !== undefined"
                  class="mt-1 text-xs text-gray-400">
                  {{ userCoins }} 硬币
                </div>
              </div>
            </div>
            <div
              v-else
              class="rounded-xl bg-gray-800/40 p-4 text-center text-sm text-gray-400 ring-1 ring-white/5">
              尚未登录，请
              <span
                class="cursor-pointer text-pink-400 font-medium hover:underline"
                @click="goToLogin">
                扫码登录
              </span>
            </div>

            <div class="flex items-center justify-between">
              <label class="font-normal">重新获取用户数据</label>
              <Button
                size="sm"
                variant="outline"
                :disabled="refreshingUserInfo"
                @click="refreshUserInfo">
                <Spinner
                  v-if="refreshingUserInfo"
                  data-icon="inline-start" />
                <RefreshCwIcon
                  v-else
                  data-icon="inline-start" />
                刷新
              </Button>
            </div>

            <div class="flex items-center justify-between">
              <label class="font-normal">刷新收藏夹缓存</label>
              <Button
                size="sm"
                variant="outline"
                :disabled="refreshingFavorites"
                @click="refreshFavoritesCache">
                <Spinner
                  v-if="refreshingFavorites"
                  data-icon="inline-start" />
                <RefreshCwIcon
                  v-else
                  data-icon="inline-start" />
                刷新
              </Button>
            </div>

            <FavoritesRefreshProgress />

            <div class="flex items-center justify-between">
              <label class="font-normal">清空收藏夹缓存</label>
              <Button
                size="sm"
                variant="outline"
                @click="clearFavoritesCache">
                <Trash2Icon data-icon="inline-start" />
                清空
              </Button>
            </div>

            <div class="flex items-center justify-between">
              <label class="font-normal">退出登录</label>
              <Button
                size="sm"
                variant="destructive"
                :disabled="!currentUserInfo || loggingOut"
                @click="handleLogout">
                <Spinner
                  v-if="loggingOut"
                  data-icon="inline-start" />
                <LogOutIcon
                  v-else
                  data-icon="inline-start" />
                退出登录
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent :value="TABS[2].id">
          <div class="flex flex-col gap-4 py-4">
            <div class="flex flex-col gap-3">
              <label class="font-normal">缓存目录 (B站下载目录)</label>
              <InputGroup>
                <InputGroupInput
                  v-model="preference['convert-config'].cachePath"
                  placeholder="选择缓存目录" />
                <InputGroupButton @click="selectCachePath">
                  <FolderOpenIcon />
                </InputGroupButton>
              </InputGroup>
            </div>

            <div class="flex flex-col gap-3">
              <label class="font-normal">输出目录</label>
              <InputGroup>
                <InputGroupInput
                  v-model="preference['convert-config'].outputDir"
                  placeholder="选择输出目录" />
                <InputGroupButton @click="selectOutputDir">
                  <FolderOpenIcon />
                </InputGroupButton>
              </InputGroup>
            </div>

            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-start gap-4">
                <label class="font-normal">内置 GPAC(Mp4box) 路径</label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <span
                        class="cursor-pointer"
                        :class="[isValidEngine ? 'text-green-400' : 'text-red-400']"
                        @click="checkMp4Box(true)">
                        <ZapIcon class="size-4" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="right">检测Mp4box是否正常</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <InputGroup>
                <InputGroupInput
                  :model-value="preference['convert-config'].gpacBinPath"
                  disabled
                  placeholder="系统默认路径" />
                <InputGroupButton @click="openGpacPath">
                  <FolderOpenIcon />
                </InputGroupButton>
              </InputGroup>
            </div>

            <div class="flex items-center justify-between">
              <label class="font-normal">重名M4S文件覆写</label>
              <Switch v-model="preference['convert-config'].forceTransform" />
            </div>

            <div class="flex items-center justify-between">
              <label class="font-normal">重名视频文件覆写</label>
              <Switch v-model="preference['convert-config'].forceComposition" />
            </div>
          </div>
        </TabsContent>

        <TabsContent :value="TABS[3].id">
          <div class="flex flex-col gap-4 py-4">
            <div class="flex flex-col gap-3">
              <label class="font-normal">输出目录</label>
              <InputGroup>
                <InputGroupInput
                  v-model="preference['download-config'].outputDir"
                  placeholder="选择输出目录" />
                <InputGroupButton @click="selectDownloadOutputDir">
                  <FolderOpenIcon />
                </InputGroupButton>
              </InputGroup>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>

    <div class="h-15 w-full shrink-0 bg-transparent pl-4 shadow backdrop-blur">
      <div class="h-full w-full flex justify-end gap-4 p-3">
        <Button
          size="sm"
          variant="ghost"
          @click="clear">
          重置
        </Button>
        <Button
          size="sm"
          @click="save">
          <SaveIcon data-icon="inline-start" />
          保存
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ExternalLink as ExternalLinkIcon,
  FolderOpen as FolderOpenIcon,
  LogOut as LogOutIcon,
  RefreshCw as RefreshCwIcon,
  Save as SaveIcon,
  Trash2 as Trash2Icon,
  Zap as ZapIcon
} from '@lucide/vue'
import {
  checkEngine,
  clearNativeStore,
  openFileDialog,
  openFolder,
  openLogFile,
  subscribeFetchPreferenceEvent
} from '@renderer/api'
import FavoritesRefreshProgress from '@renderer/components/FavoritesRefreshProgress.vue'
import { mittbus } from '@renderer/ipc'
import { fetchCurrentUserInfo } from '@renderer/services/user'
import { useAuthStore } from '@renderer/store/auth'
import { useFavoritesStore } from '@renderer/store/favorites'
import { usePreferenceStore } from '@renderer/store/preference'
import { safeCover } from '@renderer/utils/media'
import logger from 'electron-log/renderer'
import { storeToRefs } from 'pinia'
import { computed, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const store = usePreferenceStore()
const { preference } = storeToRefs(store)
const { fetchPreference, savePreference } = store
const authStore = useAuthStore()
const favoritesStore = useFavoritesStore()
const router = useRouter()
const TABS = ref([
  { id: 'NORMAL_TAB', name: '常规设置' },
  { id: 'USER_TAB', name: '用户设置' },
  { id: 'CONVERT_TAB', name: '视频转换' },
  { id: 'DOWNLOAD_TAB', name: '视频下载' }
])
const activeTabId = ref(TABS.value[0].id)

const logLevelOptions = ref(['verbose', 'info', 'warn', 'error'])
const isValidEngine = ref(true)
const refreshingFavorites = ref(false)
const refreshingUserInfo = ref(false)
const loggingOut = ref(false)

const currentUserInfo = computed(() => preference.value['user-info'] ?? null)
const userName = computed(() => currentUserInfo.value?.uname || '')
const userFace = computed(() => currentUserInfo.value?.face || '')
const userLevel = computed(() => currentUserInfo.value?.level_info?.current_level)
const isVip = computed(() => currentUserInfo.value?.vipStatus === 1)
const vipLabel = computed(() => currentUserInfo.value?.vip_label?.text || '大会员')
const isSeniorMember = computed(() => currentUserInfo.value?.is_senior_member === 1)
const userCoins = computed(() => currentUserInfo.value?.money)
const nicknameStyle = computed(() =>
  currentUserInfo.value?.vip_nickname_color ? { color: currentUserInfo.value.vip_nickname_color } : undefined
)

const subscribe = subscribeFetchPreferenceEvent(async () => {
  try {
    await fetchPreference()
    mittbus.emit('toast:add', {
      severity: 'success',
      message: '已更新配置'
    })
  } catch (error) {
    logger.error(error)
    mittbus.emit('toast:add', {
      severity: 'error',
      message: error instanceof Error ? error.message : String(error)
    })
  }
})

const selectCachePath = async (): Promise<void> => {
  const newPath = await openFileDialog({
    title: 'Select Directory',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: preference.value['convert-config'].cachePath,
    buttonLabel: 'Select'
  })
  if (newPath) {
    preference.value['convert-config'].cachePath = newPath
  }
}

const selectOutputDir = async (): Promise<void> => {
  const newPath = await openFileDialog({
    title: 'Select Directory',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: preference.value['convert-config'].outputDir,
    buttonLabel: 'Select'
  })
  if (newPath) {
    preference.value['convert-config'].outputDir = newPath
  }
}

const selectDownloadOutputDir = async (): Promise<void> => {
  const newPath = await openFileDialog({
    title: 'Select Directory',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: preference.value['download-config'].outputDir,
    buttonLabel: 'Select'
  })
  if (newPath) {
    preference.value['download-config'].outputDir = newPath
  }
}

const openGpacPath = async (): Promise<void> => {
  const binPath = preference.value['convert-config'].gpacBinPath
  return openFolder(binPath).catch(err => {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: err
    })
  })
}

const checkMp4Box = async (toastShow?: boolean): Promise<void> => {
  const isValid = await checkEngine()
  isValidEngine.value = isValid
  if (toastShow) {
    mittbus.emit('toast:add', {
      severity: isValid ? 'success' : 'error',
      message: isValid ? '已成功安装Mp4box' : '请确认您已安装Mp4Box'
    })
  }
}

const openLog = async (): Promise<void> => {
  const err = await openLogFile()
  if (err) {
    logger.error(err)
    mittbus.emit('toast:add', {
      severity: 'error',
      message: err
    })
  }
}

/**
 * 跳转到下载页的扫码登录入口
 */
const goToLogin = (): void => {
  router.push({ name: 'download-auth' })
}

const save = async (): Promise<void> => {
  savePreference()
}

/**
 * 重新获取用户收藏夹缓存（一次性拉取全部收藏夹及视频）
 */
const refreshFavoritesCache = async (): Promise<void> => {
  const userInfo = preference.value['user-info']
  if (!userInfo?.mid) {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: '用户信息缺失，请先扫码登录'
    })
    return
  }

  refreshingFavorites.value = true
  try {
    await favoritesStore.refreshAllFavorites()
    mittbus.emit('toast:add', {
      severity: 'success',
      message: '收藏夹缓存已刷新'
    })
  } catch (error) {
    logger.error('刷新用户收藏夹缓存失败:', error)
    mittbus.emit('toast:add', {
      severity: 'error',
      message: error instanceof Error ? error.message : String(error)
    })
  } finally {
    refreshingFavorites.value = false
  }
}

/**
 * 重新获取当前登录用户数据
 */
const refreshUserInfo = async (): Promise<void> => {
  refreshingUserInfo.value = true
  try {
    const userInfo = await fetchCurrentUserInfo()
    preference.value['user-info'] = userInfo
    savePreference()
    mittbus.emit('toast:add', {
      severity: 'success',
      message: '用户数据已刷新'
    })
  } catch (error) {
    logger.error('刷新用户数据失败:', error)
    mittbus.emit('toast:add', {
      severity: 'error',
      message: error instanceof Error ? error.message : String(error)
    })
  } finally {
    refreshingUserInfo.value = false
  }
}

/**
 * 退出登录：清空本地登录信息
 */
const handleLogout = async (): Promise<void> => {
  loggingOut.value = true
  try {
    await authStore.logout()
    mittbus.emit('toast:add', {
      severity: 'success',
      message: '本地登录信息已清空'
    })
  } catch (error) {
    logger.error('退出登录失败:', error)
    mittbus.emit('toast:add', {
      severity: 'error',
      message: error instanceof Error ? error.message : String(error)
    })
  } finally {
    loggingOut.value = false
  }
}

const clearFavoritesCache = (): void => {
  preference.value['favorites-data'] = null
  savePreference()
  mittbus.emit('toast:add', {
    severity: 'success',
    message: '收藏夹缓存已清空'
  })
}

const clear = (): void => {
  clearNativeStore()
}

logger.debug('Prefer created')
onUnmounted(() => {
  subscribe()
  checkMp4Box()
  logger.debug('Prefer unmounted')
})
</script>

<style scoped></style>
