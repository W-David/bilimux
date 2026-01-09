<template>
  <div class="h-full w-full flex flex-col overflow-hidden">
    <!-- 完成状态 (Success/Error) headbar -->
    <Transition name="slide-down">
      <div
        v-if="status !== ConvertStatus.Idle"
        class="h-18 w-full flex-none bg-transparent px-4 shadow backdrop-blur-2px">
        <div class="h-full w-full flex items-center justify-between p-3">
          <div class="flex items-center gap-4">
            <!-- 状态图标 -->
            <div
              class="h-10 w-10 flex items-center justify-center rounded-xl shadow-inner transition-all"
              :class="{
                'bg-green-500/10 text-green-500': status === ConvertStatus.Success,
                'bg-red-500/10 text-red-500': status === ConvertStatus.Error,
                'bg-blue-500/10 text-blue-500': status === ConvertStatus.Scanning,
                'bg-orange-500/10 text-orange-500': status === ConvertStatus.Processing
              }">
              <div
                class="text-xl"
                :class="{
                  'i-mdi-check-circle': status === ConvertStatus.Success,
                  'i-mdi-search': status === ConvertStatus.Scanning,
                  'i-mdi-close-circle': status === ConvertStatus.Error,
                  'i-mdi-loading animate-spin': status === ConvertStatus.Processing
                }"></div>
            </div>

            <!-- 状态文本 -->
            <div class="flex flex-col justify-center gap-0.5">
              <span class="text-sm text-light font-bold">
                <span v-if="status === ConvertStatus.Success">任务已完成</span>
                <span v-else-if="status === ConvertStatus.Error">任务执行出错</span>
                <span v-else-if="status === ConvertStatus.Scanning">正在扫描文件</span>
                <span v-else>正在处理任务</span>
              </span>

              <!-- 副文本/错误详情 -->
              <span
                v-if="status === ConvertStatus.Error"
                class="max-w-xs truncate text-xs text-red-400 font-medium">
                {{ errorMessage.reason }}
              </span>
              <span
                v-else-if="status === ConvertStatus.Success"
                class="text-xs text-light">
                成功: {{ successMessage.success }} / 失败: {{ successMessage.failed }}
              </span>
              <span
                v-else
                class="text-xs text-gray-300">
                请勿关闭应用
              </span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 状态切换区域 -->
    <Transition
      mode="out-in"
      name="fade-slide">
      <!-- 空闲状态 (Idle) -->
      <div
        v-if="status === ConvertStatus.Idle"
        class="h-full w-full flex flex-1 flex-col items-center justify-center gap-6">
        <div class="mb-8">
          <div class="mb-1 flex items-center justify-center">
            <img
              src="../assets/bilimux.svg"
              alt="Logo"
              class="h-20 w-20" />
            <div class="from-pink to-sky bg-gradient-to-r bg-clip-text text-6xl text-transparent font-black font-sans">
              BiliMux
            </div>
          </div>
          <div class="text-xl text-light-500 font-medium">高效、快速的 Bilibili 音视频合并工具</div>
        </div>

        <Button
          size="large"
          rounded
          class="border-none bg-pink px-8 py-4 text-xl font-bold shadow transition-all hover:shadow-2xl hover:-translate-y-1"
          @click="start">
          <i class="i-mdi-play mr-2 text-2xl"></i>
          开始转换
        </Button>
      </div>

      <div
        v-else
        class="h-full w-full flex-1 overflow-y-auto">
        <!-- 处理情况 -->
        <div
          v-if="hasTasks"
          class="min-h-full w-full flex flex-col items-center justify-center gap-2 py-4">
          <TransitionGroup name="log-flow">
            <div
              v-for="task in taskArray"
              :key="task.id"
              class="relative max-w-4xl min-w-2xl w-80% overflow-hidden rounded-xl bg-gray-800/40 p-3 shadow-sm ring-1 ring-white/5 backdrop-blur transition-all duration-300 hover:bg-gray-800/60 hover:shadow-lg hover:ring-white/10">
              <!-- 背景进度条 -->
              <div
                class="absolute bottom-0 left-0 top-0 bg-green-500/5 transition-all duration-300 ease-out"
                :style="{ width: `${task.progress}%` }"></div>

              <!-- 内容区域 -->
              <div class="relative z-10 flex items-center justify-between gap-4">
                <!-- 状态徽章 -->
                <div class="w-20 shrink-0">
                  <div
                    class="flex select-none items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors"
                    :class="{
                      'bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20':
                        task.status === 'importing' || task.status === 'writing',
                      'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20': task.status === 'preprocess',
                      'bg-green-500/10 text-green-400 ring-1 ring-green-500/20': task.status === 'success',
                      'bg-red-500/10 text-red-400 ring-1 ring-red-500/20': task.status === 'fail',
                      'bg-gray-500/10 text-gray-400 ring-1 ring-gray-500/20': task.status === 'waiting',
                      'animate-pulse':
                        task.status === 'preprocess' || task.status === 'importing' || task.status === 'writing'
                    }">
                    <div
                      class="text-base"
                      :class="{
                        'i-mdi-import': task.status === 'importing',
                        'i-mdi-export': task.status === 'writing',
                        'i-mdi-progress-pencil': task.status === 'preprocess',
                        'i-mdi-check-circle': task.status === 'success',
                        'i-mdi-alert-circle': task.status === 'fail',
                        'i-mdi-timer-sand': task.status === 'waiting'
                      }"></div>
                    <span>{{ statusTextMap[task.status] || '等待中' }}</span>
                  </div>
                </div>

                <!-- 文件名 -->
                <div class="flex-1 truncate">
                  <div class="truncate text-sm text-gray-200 font-medium tracking-wide">
                    {{ task.fileName }}
                  </div>
                </div>

                <!-- 操作按钮 -->
                <div class="h-8 w-8 flex shrink-0 items-center justify-center">
                  <div
                    v-if="task.status === 'success'"
                    class="i-mdi-play-circle cursor-pointer text-2xl text-green-400 transition-transform duration-200 hover:scale-110 hover:text-green-300"
                    @click="openTaskFile(task)"></div>
                  <div
                    v-else-if="task.status === 'fail'"
                    v-tooltip.left="task.message"
                    class="i-mdi-alert-circle cursor-help text-2xl text-red-400"></div>
                  <ProgressSpinner
                    v-else
                    class="h-5 w-5"
                    stroke-width="6"
                    fill="transparent"
                    animation-duration="1s" />
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>

        <div
          v-if="status === ConvertStatus.Scanning"
          class="h-full w-full flex">
          <div class="i-mdi-file-document-box-search-outline m-auto animate-pulse font-size-20 color-pink"></div>
        </div>

        <div
          v-if="status === ConvertStatus.Error"
          class="h-full w-full flex">
          <div class="i-mdi-file-document-remove-outline m-auto font-size-20 color-gray"></div>
        </div>
      </div>
    </Transition>

    <!-- 完成状态 (Success/Error) footbar -->
    <Transition name="slide-up">
      <div
        v-if="status !== ConvertStatus.Idle"
        class="h-18 w-full bg-transparent pl-4 shadow backdrop-blur-2px">
        <div class="h-full w-full flex justify-end gap-4 p-3">
          <div class="flex gap-2">
            <Button
              v-if="status === ConvertStatus.Success"
              severity="help"
              variant="text"
              @click="reset">
              <i class="i-mdi-step-backward mr-1"></i>
              返回
            </Button>

            <Button
              v-if="status === ConvertStatus.Success"
              severity="success"
              variant="text"
              @click="openOutputFolder">
              <i class="i-mdi-folder-open mr-1"></i>
              打开输出目录
            </Button>
            <Button
              v-if="status === ConvertStatus.Error"
              severity="danger"
              variant="text"
              @click="reset">
              <i class="i-mdi-refresh mr-1"></i>
              重试
            </Button>

            <Button
              v-if="status === ConvertStatus.Error"
              severity="help"
              variant="text"
              @click="openSetting">
              <i class="i-mdi-cog mr-1"></i>
              打开设置
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import {
  openPath,
  startProcess,
  subscribeProcessBrokeEvent,
  subscribeProcessItemEndEvent,
  subscribeProcessItemProgressEvent,
  subscribeProcessItemStartEvent,
  subscribeProcessReadyEvent,
  subscribeProcessStartEvent,
  subscribeProcessSuccessEvent
} from '@renderer/api'
import { mittbus } from '@renderer/ipc'
import { usePreferenceStore } from '@renderer/store/preference'
import logger from 'electron-log/renderer'
import { storeToRefs } from 'pinia'
import type { ProgressStatus } from 'src/main/config/types'
import { computed, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

const store = usePreferenceStore()
const router = useRouter()
const { preference } = storeToRefs(store)

// 引擎状态管理
enum ConvertStatus {
  Idle = 'idle',
  Scanning = 'scanning',
  Processing = 'processing',
  Success = 'success',
  Error = 'error'
}

interface Task {
  id: string
  fileName: string
  filePath: string
  status: ProgressStatus
  progress: number
  finished: boolean
  message: string
}

const statusTextMap: Record<string, string> = {
  importing: '导入中',
  writing: '写入中',
  preprocess: '预处理',
  success: '已完成',
  fail: '出错了',
  waiting: '等待中'
}

const status = ref<ConvertStatus>(ConvertStatus.Idle)

const successMessage = reactive({
  success: 0,
  failed: 0
})
const errorMessage = reactive({
  reason: ''
})

// 任务列表
const tasks = ref<Map<string, Task>>(new Map())
const taskArray = computed(() => Array.from(tasks.value.values()))
const hasTasks = computed(() => tasks.value.size > 0)

const unsubscribes: (() => void)[] = []

const registerSubscribe = (fn: () => void): void => {
  unsubscribes.push(fn)
}
const unregisterSubscribes = (): void => {
  unsubscribes.forEach(fn => fn && fn())
  unsubscribes.length = 0
}

registerSubscribe(
  subscribeProcessStartEvent(() => {
    logger.debug('process:start')
    status.value = ConvertStatus.Scanning
  })
)

registerSubscribe(
  subscribeProcessReadyEvent(({ bvs }) => {
    logger.debug('process:ready', bvs)
    status.value = ConvertStatus.Processing
    // const statusList = ['success', 'fail', 'importing', 'preprocess', 'waiting', 'writing'] as ProgressStatus[]
    // statusList.forEach((status, id) => {
    //   tasks.value.set(id.toString(), {
    //     id: id.toString(),
    //     fileName: status + '-----------File',
    //     filePath: status + '-----------FilePath',
    //     status,
    //     progress: 0,
    //     finished: status === 'success',
    //     message: 'TEST ------------------------------------------------------- INFO'
    //   })
    // })
    bvs.forEach(task => {
      tasks.value.set(task.bvid, {
        id: task.bvid,
        fileName: task.fileInfo.fileName,
        filePath: task.fileInfo.filePath,
        status: 'waiting',
        progress: 0,
        finished: false,
        message: ''
      })
    })
  })
)

registerSubscribe(
  subscribeProcessSuccessEvent(data => {
    logger.debug('process:success', data)
    status.value = ConvertStatus.Success
    successMessage.success = data.count.success
    successMessage.failed = data.count.fail
  })
)

registerSubscribe(
  subscribeProcessBrokeEvent(data => {
    logger.debug('process:broke', data)
    status.value = ConvertStatus.Error
    errorMessage.reason = data.reason
  })
)

registerSubscribe(
  subscribeProcessItemStartEvent(args => {
    logger.debug('process:item:start', args)
  })
)

registerSubscribe(
  subscribeProcessItemProgressEvent(progressData => {
    // logger.debug('process:item:progress', progressData)
    const task = tasks.value.get(progressData.bvid)
    if (task) {
      task.progress = progressData.progress
      task.status = progressData.type
    }
  })
)

registerSubscribe(
  subscribeProcessItemEndEvent(resultData => {
    logger.debug('process:item:end', resultData)
    const task = tasks.value.get(resultData.bvid)
    if (task) {
      if (resultData.success) {
        task.finished = true
        task.status = 'success'
        task.progress = 100
        task.message = resultData.message
      } else {
        task.finished = false
        task.status = 'fail'
        task.progress = 0
        task.message = resultData.message
      }
    }
  })
)

const start = async (): Promise<void> => {
  successMessage.success = 0
  successMessage.failed = 0
  errorMessage.reason = ''
  tasks.value = new Map()

  const start = new Date().getTime()

  await startProcess()

  logger.info(`总任务耗时: ${new Date().getTime() - start}ms`)
}

const reset = (): void => {
  status.value = ConvertStatus.Idle
  successMessage.success = 0
  successMessage.failed = 0
  errorMessage.reason = ''
  tasks.value = new Map()
}

const openSetting = (): void => {
  router.push({ name: 'settings' })
}

const openOutputFolder = async (): Promise<void> => {
  const errMessage = await openPath(preference.value['convert-config'].outputDir)
  if (errMessage) {
    mittbus.emit('toast:add', {
      severity: 'error',
      summary: '错误',
      detail: errMessage,
      life: 3000
    })
  }
}

/**
 * 使用系统默认程序打开视频文件
 */
const openTaskFile = async (task: Task): Promise<void> => {
  if (!task.filePath) {
    mittbus.emit('toast:add', {
      severity: 'warn',
      summary: '提示',
      detail: '文件路径不存在',
      life: 3000
    })
    return
  }

  const errMessage = await openPath(task.filePath)
  if (errMessage) {
    mittbus.emit('toast:add', {
      severity: 'error',
      summary: '错误',
      detail: errMessage,
      life: 3000
    })
  }
}

onUnmounted(() => {
  logger.debug('Convert unmounted')
  unregisterSubscribes()
})
logger.debug('Convert created')
</script>
