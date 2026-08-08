<template>
  <div class="h-full w-full flex flex-col overflow-hidden">
    <!-- 完成状态 (Success/Error) headbar -->
    <Transition name="slide-down">
      <div
        v-if="status !== ConvertStatus.Idle"
        class="h-18 w-full flex-none bg-transparent px-4 shadow backdrop-blur-[2px]">
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
              <component
                :is="statusIcon"
                class="text-xl"
                :class="{ 'animate-spin': status === ConvertStatus.Processing }" />
            </div>

            <!-- 状态文本 -->
            <div class="flex flex-col justify-center gap-0.5">
              <span class="text-sm text-[#f6f6f6] font-bold">
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
                class="text-xs text-[#f6f6f6]">
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
            <div
              class="from-pink-400 to-sky-400 bg-linear-to-r bg-clip-text text-6xl text-transparent font-black font-sans">
              BiliMux
            </div>
          </div>
          <div class="text-xl text-[#f2f2f2] font-medium">高效、快速的 Bilibili 视频合并工具</div>
        </div>

        <Button
          size="lg"
          class="border-none bg-pink-400 px-8 py-4 text-xl font-bold shadow transition-all hover:shadow-2xl hover:-translate-y-1"
          @click="start">
          <PlayIcon class="mr-2 size-6" />
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
            <ConvertTaskItem
              v-for="task in taskArray"
              :key="task.id"
              :task="task" />
          </TransitionGroup>
        </div>

        <div
          v-if="status === ConvertStatus.Scanning"
          class="h-full w-full flex">
          <FileSearchIcon class="m-auto size-20 animate-pulse text-pink-400" />
        </div>

        <div
          v-if="status === ConvertStatus.Error"
          class="h-full w-full flex">
          <FileXIcon class="m-auto size-20 text-gray-400" />
        </div>
      </div>
    </Transition>

    <!-- 完成状态 (Success/Error) footbar -->
    <Transition name="slide-up">
      <div
        v-if="status !== ConvertStatus.Idle"
        class="h-18 w-full bg-transparent pl-4 shadow backdrop-blur-[2px]">
        <div class="h-full w-full flex justify-end gap-4 p-3">
          <div class="flex gap-2">
            <Button
              v-if="status === ConvertStatus.Success"
              size="sm"
              variant="ghost"
              @click="reset">
              <StepBackIcon class="mr-1 size-4" />
              返回
            </Button>

            <Button
              v-if="status === ConvertStatus.Success"
              size="sm"
              variant="ghost"
              @click="openOutputFolder">
              <FolderOpenIcon class="mr-1 size-4" />
              打开输出目录
            </Button>
            <Button
              v-if="status === ConvertStatus.Error"
              size="sm"
              variant="ghost"
              @click="reset">
              <RefreshCwIcon class="mr-1 size-4" />
              重试
            </Button>

            <Button
              v-if="status === ConvertStatus.Error"
              size="sm"
              variant="ghost"
              @click="openSetting">
              <SettingsIcon class="mr-1 size-4" />
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
  CheckCircle as CheckCircleIcon,
  CircleX as CircleXIcon,
  FileSearch as FileSearchIcon,
  FileX as FileXIcon,
  FolderOpen as FolderOpenIcon,
  Loader2 as Loader2Icon,
  Play as PlayIcon,
  RefreshCw as RefreshCwIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  StepBack as StepBackIcon
} from '@lucide/vue'
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
import ConvertTaskItem, { type ConvertTask } from '@renderer/components/ConvertTaskItem.vue'
import { mittbus } from '@renderer/ipc'
import { usePreferenceStore } from '@renderer/store/preference'
import logger from 'electron-log/renderer'
import { storeToRefs } from 'pinia'
import { computed, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

const store = usePreferenceStore()
const router = useRouter()
const { preference } = storeToRefs(store)

// 引擎状态管理
enum ConvertStatus {
  Idle,
  Scanning,
  Processing,
  Success,
  Error
}

const status = ref<ConvertStatus>(ConvertStatus.Idle)

const statusIcon = computed(() => {
  switch (status.value) {
    case ConvertStatus.Success:
      return CheckCircleIcon
    case ConvertStatus.Scanning:
      return SearchIcon
    case ConvertStatus.Error:
      return CircleXIcon
    case ConvertStatus.Processing:
      return Loader2Icon
    default:
      return null
  }
})

const successMessage = reactive({
  success: 0,
  failed: 0
})
const errorMessage = reactive({
  reason: ''
})

// 任务列表
const tasks = ref<Map<string, ConvertTask>>(new Map())
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
    // tasks.value.set(id.toString(), {
    // id: id.toString(),
    // fileName: status + '-----------File',
    // filePath: status + '-----------FilePath',
    // status,
    // progress: 0,
    // finished: status === 'success',
    // message: 'TEST ------------------------------------------------------- INFO'
    // })
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
  router.push({ name: 'prefer' })
}

const openOutputFolder = async (): Promise<void> => {
  const errMessage = await openPath(preference.value['convert-config'].outputDir)
  if (errMessage) {
    mittbus.emit('toast:add', {
      severity: 'error',
      message: errMessage
    })
  }
}

onUnmounted(() => {
  logger.debug('Convert unmounted')
  unregisterSubscribes()
})
logger.debug('Convert created')
</script>
