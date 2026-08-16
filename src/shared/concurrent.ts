export const CONCURRENT_OPTIONS = [1, 2, 4, 8] as const
export type ConcurrentCount = (typeof CONCURRENT_OPTIONS)[number]

/** 将配置值收敛到 1/2/4/8；旧的 16 会落到 8 */
export function clampConcurrent(value: unknown): ConcurrentCount {
  const n = Math.trunc(Number(value))
  if ((CONCURRENT_OPTIONS as readonly number[]).includes(n)) return n as ConcurrentCount
  if (n >= 8) return 8
  if (n >= 4) return 4
  if (n >= 2) return 2
  return 1
}
