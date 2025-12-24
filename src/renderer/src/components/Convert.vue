<template>
  <div class="relative h-full w-full flex flex-col items-center justify-center overflow-hidden p-6">
    <!-- 状态切换区域 -->
    <Transition mode="out-in" name="fade-slide">
      <!-- 完成状态 (Success/Error) -->
      <div
        v-if="status === ConvertStatus.Success || status === ConvertStatus.Error"
        class="flex flex-col items-center gap-8"
      >
        <div class="flex flex-col items-center gap-4">
          <div
            :class="[
              'text-9xl mb-4',
              status === ConvertStatus.Success
                ? 'i-mdi-check-circle text-[#FB7299]'
                : 'i-mdi-alert-circle text-red-500'
            ]"
          ></div>
          <h2 class="text-4xl text-light-900 font-bold">
            {{ status === ConvertStatus.Success ? '转换完成' : '出错了' }}
          </h2>
          <p class="max-w-md text-center text-lg text-light-500">
            {{
              status === ConvertStatus.Success
                ? '所有文件已成功合并，您可以点击下方按钮查看结果'
                : errorMessage
            }}
          </p>
        </div>

        <div class="flex gap-4">
          <Button
            v-if="status === ConvertStatus.Success"
            severity="secondary"
            outlined
            size="large"
            class="px-6"
            @click="reset"
          >
            <i class="i-mdi-step-backward mr-2"></i>
            返回
          </Button>

          <Button
            v-if="status === ConvertStatus.Success"
            size="large"
            class="px-8 font-bold shadow-lg"
            @click="openOutputFolder"
          >
            <i class="i-mdi-folder-open mr-2 text-xl"></i>
            打开输出目录
          </Button>

          <Button
            v-if="status === ConvertStatus.Error"
            severity="danger"
            size="large"
            class="px-8"
            @click="reset"
          >
            <i class="i-mdi-refresh mr-2"></i>
            重试
          </Button>
        </div>
      </div>

      <!-- 处理中状态 (Processing) -->
      <div v-else-if="status === ConvertStatus.Processing" :key="ConvertStatus.Processing">
        <div class="w-200 rounded-2xl bg-black/30 px-8 py-4 shadow-2xl backdrop-blur-2xl">
          <!-- 文件名 -->
          <div class="h-16 flex items-center justify-center text-6">
            <Transition mode="out-in" name="fade">
              <div :key="currentFile" class="truncate text-4 text-light font-bold tracking-wide">
                {{ currentFile ? `${currentFile}` : '......' }}
              </div>
            </Transition>
          </div>

          <ProgressBar :value="itemProgress" :show-value="false" class="!h-1"></ProgressBar>

          <!-- 信息状态 -->
          <div class="h-16 w-full flex items-center justify-center text-4">
            <div class="'w-30 flex-auto flex-shrink-0 flex-grow-0 p-4 text-end">
              <span v-if="currentType === ProcessType.Importing" class="animate-pulse text-yellow">
                <i class="i-mdi-import mb-2px mr-2"></i>
                <span>导入中</span>
              </span>
              <span
                v-else-if="currentType === ProcessType.Writing"
                class="animate-pulse text-green"
              >
                <i class="i-mdi-export mb-[2px] mr-1"></i>
                <span>写入中</span>
              </span>
              <span v-else class="animate-pulse text-blue"
                ><i class="i-mdi-cog mb-[2px] mr-2"></i> <span>预处理</span></span
              >
            </div>
            <div class="w-20 flex-shrink-0 flex-grow-0 p-4 text-gray-400 font-mono">
              {{
                `(${currentProgress ? (currentProgress < 10 ? '0' + currentProgress : currentProgress) : '00'}%)`
              }}
            </div>
            <!-- <div class="w-100 flex-auto truncate px-4 text-start text-indigo font-sans">
              {{ currentRaw }}
            </div> -->
          </div>
        </div>
      </div>

      <!-- 空闲状态 (Idle) -->
      <div v-else :key="ConvertStatus.Idle" class="flex flex-col items-center justify-center gap-6">
        <div class="mb-8">
          <div class="mb-1 flex items-center justify-center">
            <img src="../assets/bilimux.svg" alt="Logo" class="h-20 w-20" />
            <div
              class="from-[#FB7299] to-[#00A1D6] bg-gradient-to-r bg-clip-text text-6xl text-transparent font-black"
            >
              BiliMux
            </div>
          </div>
          <div class="text-xl text-light-500 font-medium">高效、快速的 Bilibili 音视频合并工具</div>
        </div>

        <Button
          size="large"
          rounded
          class="border-none bg-[#FB7299] px-8 py-4 text-xl font-bold shadow-xl transition-all hover:shadow-2xl hover:-translate-y-1"
          @click="start"
        >
          <i class="i-mdi-play mr-2 text-2xl"></i>
          开始转换
        </Button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import {
  openPath,
  startProcess,
  subscribeItemProgressEvent,
  subscribeProcessProgressEvent
} from '@renderer/api'
import { usePreferenceStore } from '@renderer/store/preference'
import logger from 'electron-log/renderer'
import { storeToRefs } from 'pinia'
import { onUnmounted, ref } from 'vue'

const store = usePreferenceStore()
const { preference } = storeToRefs(store)

// 状态管理
enum ConvertStatus {
  Idle = 'idle',
  Processing = 'processing',
  Success = 'success',
  Error = 'error'
}

enum ProcessType {
  Preprocess = 'preprocess',
  Importing = 'importing',
  Writing = 'writing'
}

const status = ref<ConvertStatus>(ConvertStatus.Idle)
const errorMessage = ref('')

const currentFile = ref('')
const currentType = ref<ProcessType>(ProcessType.Preprocess)
const currentRaw = ref('')
const currentProgress = ref<number>(0)
const itemProgress = ref<number>(0)

const unsubscribes: (() => void)[] = []

const registerSubscribe = (fn: () => void): void => {
  unsubscribes.push(fn)
}
const unregisterSubscribes = (): void => {
  unsubscribes.forEach((fn) => fn && fn())
}

const start = async (): Promise<void> => {
  status.value = ConvertStatus.Processing
  currentFile.value = ''
  currentType.value = ProcessType.Preprocess
  currentProgress.value = 0
  errorMessage.value = ''
  itemProgress.value = 0

  unregisterSubscribes()

  // currentType.value = ProcessType.Preprocess
  // currentFile.value = 'FOJSDFJIDOFJIDSJFOIDJSFKSJDFKJS'
  // currentProgress.value = 55
  // currentRaw.value = 'OIDFODIFJDKLFIEFJLSDKFJIEFOJSJDFKJSFISEFJSOEIJFKLSDJFISEOFJSEJFLSKEJFIOESJ'

  registerSubscribe(
    subscribeProcessProgressEvent((data) => {
      currentType.value = data.type as ProcessType
      currentFile.value = data.file
      currentProgress.value = data.progress || 0
      currentRaw.value = data.raw
    })
  )

  registerSubscribe(
    subscribeItemProgressEvent((data) => {
      const progress = Math.ceil(((data.idx + 1) / data.len) * 100)
      itemProgress.value = progress
    })
  )

  try {
    await startProcess()
    status.value = ConvertStatus.Success
  } catch (e) {
    status.value = ConvertStatus.Error
    const message = e instanceof Error ? e.message : String(e)
    errorMessage.value = message
    logger.error(message)
  } finally {
    unregisterSubscribes()
  }
}

const reset = (): void => {
  currentFile.value = ''
  currentProgress.value = 0
  itemProgress.value = 0
  errorMessage.value = ''
  currentType.value = ProcessType.Preprocess
  status.value = ConvertStatus.Idle
}

const openOutputFolder = async (): Promise<void> => {
  openPath(preference.value['convert-config'].outputDir)
}

onUnmounted(() => {
  logger.debug('Convert unmounted')
  unregisterSubscribes()
})
logger.debug('Convert created')
</script>

<style scoped>
/* 渐入滑动 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition:
    opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: opacity, transform;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 日志流动画 */
.log-flow-enter-active,
.log-flow-leave-active {
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform, opacity;
}

.log-flow-enter-from {
  opacity: 0;
  transform: translateY(30px) scale(0.5);
}

.log-flow-leave-to {
  opacity: 0;
  transform: translateY(-30px) scale(0.5);
}

/* 淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
  will-change: opacity;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 向上滑动 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition:
    opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, opacity;
}

.slide-up-enter-from {
  opacity: 0;
  scale: 0.5;
  transform: translateY(32px);
}
.slide-up-leave-to {
  opacity: 0;
  scale: 0.5;
  transform: translateY(-32px);
}
</style>
