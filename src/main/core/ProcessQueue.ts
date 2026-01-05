import { EventEmitter } from 'node:events'
import logger from './Logger'

interface QueueEventMap {
  'active-count-change': [number]
  'task-completed': []
  paused: []
  resumed: []
  cleared: []
  drain: []
}

interface ProcessQueueOptions {
  concurrency: number
}

interface QueueTask<T> {
  fn: () => Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
}

export default class ProcessQueue<T> extends EventEmitter<QueueEventMap> {
  private queue: QueueTask<T>[]
  private activeCount: number
  private concurrency: number
  private isPaused: boolean

  constructor(options: ProcessQueueOptions) {
    super()
    this.concurrency = options.concurrency || 4
    this.activeCount = 0
    this.queue = []
    this.isPaused = false
    logger.info(this.constructor.name, 'inited')
  }

  /**
   * 添加任务到队列
   * @param fn 返回 Promise 的函数
   */
  public add(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject })
      this.next()
    })
  }

  /**
   * 执行队列中的下一个任务
   */
  private next() {
    if (this.isPaused) return

    while (this.activeCount < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift()
      if (task) {
        this.activeCount++
        this.emit('active-count-change', this.activeCount)

        task
          .fn()
          .then(task.resolve)
          .catch(task.reject)
          .finally(() => {
            this.activeCount--
            this.emit('active-count-change', this.activeCount)
            this.emit('task-completed')
            this.next()

            if (this.activeCount === 0 && this.queue.length === 0) {
              this.emit('drain')
            }
          })
      }
    }
  }

  /**
   * 设置并发数
   */
  public setConcurrency(count: number) {
    if (count < 1) return
    this.concurrency = count
    this.next()
  }

  /**
   * 暂停队列执行
   */
  public pause() {
    this.isPaused = true
    this.emit('paused')
  }

  /**
   * 恢复队列执行
   */
  public resume() {
    if (this.isPaused) {
      this.isPaused = false
      this.emit('resumed')
      this.next()
    }
  }

  /**
   * 清空队列（未执行的任务会被 reject）
   */
  public clear() {
    while (this.queue.length > 0) {
      const task = this.queue.shift()
      task?.reject(new Error('Queue cleared'))
    }
    this.emit('cleared')
  }

  /**
   * 获取当前状态
   */
  public get status() {
    return {
      active: this.activeCount,
      pending: this.queue.length,
      concurrency: this.concurrency,
      isPaused: this.isPaused
    }
  }

  /**
   * 等待所有任务完成
   */
  public onIdle(): Promise<void> {
    if (this.activeCount === 0 && this.queue.length === 0) {
      return Promise.resolve()
    }
    return new Promise(resolve => {
      const onDrain = () => {
        resolve()
        this.off('drain', onDrain)
      }
      this.once('drain', onDrain)
    })
  }
}
