<template>
  <div class="h-full w-full flex flex-col overflow-hidden">
    <!-- 完成状态 (Success/Error) headbar -->
    <Transition name="slide-down">
      <div
        v-if="status === ConvertStatus.Success || status === ConvertStatus.Error"
        class="h-15 w-full bg-transparent pl-4 shadow backdrop-blur">
        <div
          v-if="status === ConvertStatus.Success"
          class="h-full w-full flex justify-start gap-4">
          <div class="w-50 flex items-center justify-start">
            <span class="ml-2 w-90% truncate text-4 text-green font-mono">{{ endMessage }}</span>
          </div>
        </div>
        <div
          v-else
          class="h-full w-full flex justify-start gap-4">
          <div class="w-50 flex items-center justify-center">
            <span class="ml-2 w-90% truncate text-4 text-red font-mono">{{ endMessage }}</span>
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
            <div class="from-[#FB7299] to-[#00A1D6] bg-gradient-to-r bg-clip-text text-6xl text-transparent font-black">
              BiliMux
            </div>
          </div>
          <div class="text-xl text-light-500 font-medium">高效、快速的 Bilibili 音视频合并工具</div>
        </div>

        <Button
          size="large"
          rounded
          class="border-none bg-[#FB7299] px-8 py-4 text-xl font-bold shadow transition-all hover:shadow-2xl hover:-translate-y-1"
          @click="start">
          <i class="i-mdi-play mr-2 text-2xl"></i>
          开始转换
        </Button>
      </div>

      <div
        v-else
        class="h-full w-full flex-1 overflow-y-auto">
        <!-- 处理情况 (Processing) -->
        <div
          v-if="hasTasks"
          class="min-h-full w-full flex flex-col items-center justify-center gap-2 py-4">
          <TransitionGroup name="log-flow">
            <div
              v-for="task in taskArray"
              :key="task.id"
              class="max-w-4xl min-w-2xl w-80% rounded-xl bg-black/30 p-4 shadow-sm hover:bg-black/50 hover:shadow-lg">
              <!-- 文件名 -->
              <div class="mb-3 flex items-center justify-between">
                <div class="truncate text-sm text-light font-bold tracking-wide">
                  {{ task.fileName }}
                </div>
                <Button
                  severity="success"
                  size="small"
                  variant="text">
                  <div
                    class="i-mdi-movie-open-play"
                    @click="openTaskFile(task)"></div>
                </Button>
              </div>

              <div class="flex items-center justify-between gap-4">
                <!-- 状态 -->
                <div class="w-24 shrink-0">
                  <Message
                    v-if="task.status === 'importing'"
                    icon="i-mdi-import"
                    variant="simple"
                    size="small"
                    severity="warn">
                    <span class="animate-pulse">导入中</span>
                  </Message>
                  <Message
                    v-else-if="task.status === 'writing'"
                    icon="i-mdi-export"
                    severity="warn"
                    size="small"
                    variant="simple">
                    <span class="animate-pulse">写入中</span>
                  </Message>
                  <Message
                    v-else-if="task.status === 'preprocess'"
                    icon="i-mdi-progress-pencil"
                    size="small"
                    variant="simple"
                    severity="info">
                    <span>预处理</span>
                  </Message>
                  <Message
                    v-else-if="task.status === 'success'"
                    size="small"
                    variant="simple"
                    severity="success"
                    icon="i-mdi-check-circle">
                    <span>已完成</span>
                  </Message>
                  <Message
                    v-else-if="task.status === 'fail'"
                    icon="i-mdi-alert-circle"
                    size="small"
                    variant="simple"
                    severity="error">
                    <span>出错了</span>
                  </Message>
                  <Message
                    v-else
                    icon="i-mdi-timer-sand"
                    size="small"
                    variant="simple"
                    severity="secondary">
                    <span>等待中</span>
                  </Message>
                </div>

                <!-- 进度条 -->
                <div
                  v-if="task.status === 'success'"
                  class="flex-1">
                  <ProgressBar
                    :value="task.progress ?? 0"
                    :mode="task.progress === null ? 'indeterminate' : 'determinate'"
                    :show-value="false"
                    class="h-1.5 bg-white/10!"></ProgressBar>
                </div>

                <!-- 百分比 -->
                <div
                  v-if="task.status === 'success'"
                  class="w-12 text-end text-xs text-gray-400">
                  {{ task.progress ? `${task.progress}%` : '--' }}
                </div>

                <div
                  v-if="task.status === 'fail'"
                  class="flex-1 truncate text-end font-size-3 text-red-300 font-italic underline">
                  {{ task.message }}
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>

        <div
          v-else
          class="h-full w-full flex px-8 py-4">
          <div class="i-mdi-file-document-remove-outline font-size-20 color-gray"></div>
        </div>
      </div>
    </Transition>

    <!-- 完成状态 (Success/Error) footbar -->
    <Transition name="slide-up">
      <div
        v-if="status === ConvertStatus.Success || status === ConvertStatus.Error"
        class="h-15 w-full bg-transparent pl-4 shadow backdrop-blur">
        <div
          v-if="status === ConvertStatus.Success"
          class="h-full w-full flex justify-end gap-4 p-3">
          <div class="flex gap-2">
            <Button
              severity="help"
              variant="text"
              @click="reset">
              <i class="i-mdi-step-backward mr-1"></i>
              返回
            </Button>

            <Button
              severity="success"
              variant="text"
              @click="openOutputFolder">
              <i class="i-mdi-folder-open mr-1"></i>
              打开输出目录
            </Button>
          </div>
        </div>
        <div
          v-else
          class="h-full w-full flex justify-end gap-4 p-3">
          <div class="flex gap-2">
            <Button
              severity="danger"
              variant="text"
              @click="reset">
              <i class="i-mdi-refresh mr-1"></i>
              重试
            </Button>

            <Button
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
  subscribeProcessEndEvent,
  subscribeProcessProgressEvent,
  subscribeProcessReadyEvent,
  subscribeProcessStartEvent,
  subscribeProcessSuccessEvent
} from '@renderer/api'
import { mittbus } from '@renderer/ipc'
import { usePreferenceStore } from '@renderer/store/preference'
import logger from 'electron-log/renderer'
import { storeToRefs } from 'pinia'
import type { ProgressStatus } from 'src/main/config/types'
import { computed, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const store = usePreferenceStore()
const router = useRouter()
const { preference } = storeToRefs(store)

// 引擎状态管理
enum ConvertStatus {
  Idle = 'idle',
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

const status = ref<ConvertStatus>(ConvertStatus.Idle)
const endMessage = ref('')

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
  subscribeProcessReadyEvent(({ bvs }) => {
    logger.debug('process:ready', bvs)
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
  })
)

registerSubscribe(
  subscribeProcessBrokeEvent(data => {
    logger.debug('process:broke', data)
    status.value = ConvertStatus.Error
    endMessage.value = data.reason
  })
)

registerSubscribe(
  subscribeProcessSuccessEvent(data => {
    logger.debug('process:success', data)
    status.value = ConvertStatus.Success
    endMessage.value = `转换完成: [${data.count.success}/${data.count.success + data.count.fail}]`
  })
)

registerSubscribe(
  subscribeProcessStartEvent(args => {
    logger.debug('process:item:start', args)
    const task = args.bv
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
)

registerSubscribe(
  subscribeProcessProgressEvent(progressData => {
    // logger.debug('process:item:progress', progressData)
    const task = tasks.value.get(progressData.bvid)
    if (task) {
      task.progress = progressData.progress
      task.status = progressData.type
    }
  })
)

registerSubscribe(
  subscribeProcessEndEvent(resultData => {
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
  status.value = ConvertStatus.Processing
  endMessage.value = ''
  tasks.value = new Map()

  const start = new Date().getTime()

  await startProcess()

  logger.info(`总任务耗时: ${new Date().getTime() - start}ms`)
}

const reset = (): void => {
  status.value = ConvertStatus.Idle
  endMessage.value = ''
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
