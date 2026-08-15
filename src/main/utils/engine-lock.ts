let chain = Promise.resolve()

/** 转换与下载共用：同一时刻只跑一个 MP4Box */
export function withEngineLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn)
  chain = run.then(
    () => undefined,
    () => undefined
  )
  return run
}
