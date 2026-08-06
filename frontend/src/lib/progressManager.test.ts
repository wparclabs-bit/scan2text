import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { startProgress, stopProgress } from './progressManager'

describe('progressManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should call onUpdate with increasing progress', async () => {
    const onUpdate = vi.fn()
    startProgress('job-1', onUpdate)
    await vi.advanceTimersByTimeAsync(5_000)
    expect(onUpdate).toHaveBeenCalledWith('job-1', expect.any(Number))
    const calls = onUpdate.mock.calls.map((c) => c[1])
    expect(calls[0]).toBeGreaterThan(0)
  })

  it('should stop calling onUpdate after job is stopped', async () => {
    const onUpdate = vi.fn()
    startProgress('job-1', onUpdate)
    await vi.advanceTimersByTimeAsync(1_000)
    const callsBefore = onUpdate.mock.calls.length
    stopProgress('job-1')
    await vi.advanceTimersByTimeAsync(1_000)
    expect(onUpdate.mock.calls.length).toBe(callsBefore)
  })

  it('should allow restarting a timer for the same job', async () => {
    const onUpdate = vi.fn()
    startProgress('job-1', onUpdate)
    await vi.advanceTimersByTimeAsync(1_000)
    startProgress('job-1', onUpdate)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(onUpdate.mock.calls.length).toBeGreaterThan(1)
  })
})
