const activeTimers = new Map<string, ReturnType<typeof setInterval>>()

export function startProgress(jobId: string, onUpdate: (jobId: string, progress: number) => void): void {
  stopProgress(jobId)

  const startTime = Date.now()
  const duration = 30_000

  const interval = globalThis.setInterval(() => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(90, (elapsed / duration) * 90)
    onUpdate(jobId, Math.round(progress))

    if (progress >= 90) {
      globalThis.clearInterval(interval)
      activeTimers.delete(jobId)
    }
  }, 300)

  activeTimers.set(jobId, interval)
}

export function stopProgress(jobId: string): void {
  const interval = activeTimers.get(jobId)
  if (interval) {
    globalThis.clearInterval(interval)
    activeTimers.delete(jobId)
  }
}

export function setProgress(jobId: string, _progress: number): void {
  stopProgress(jobId)
}
