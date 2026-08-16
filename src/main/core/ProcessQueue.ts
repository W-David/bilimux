import { EventEmitter } from 'node:events'

interface QueueEventMap {
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

  constructor(options: ProcessQueueOptions) {
    super()
    this.concurrency = options.concurrency || 4
    this.activeCount = 0
    this.queue = []
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
    while (this.activeCount < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift()
      if (task) {
        this.activeCount++

        Promise.resolve()
          .then(() => task.fn())
          .then(task.resolve)
          .catch(task.reject)
          .finally(() => {
            this.activeCount--
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
