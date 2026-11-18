import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cancelTask, isTaskCancelled, isTaskTerminal, pollTaskStatus } from './api'
import { buildApiUrl } from './apiBase'

describe('T06 — cancellation in the API seam', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('test_cancel_task_posts_to_the_cancel_endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ task_id: 't1', status: 'cancelled', cancelled: true }),
    })

    const result = await cancelTask('t1')

    expect(mockFetch).toHaveBeenCalledWith(
      buildApiUrl('/cancel/t1'),
      expect.objectContaining({ method: 'POST' }),
    )
    expect(result.status).toBe('cancelled')
    expect(result.cancelled).toBe(true)
  })

  it('test_a_cancelled_status_is_terminal_and_stops_the_polling', async () => {
    expect(isTaskCancelled({ task_id: 't', status: 'cancelled' })).toBe(true)
    expect(isTaskCancelled({ task_id: 't', status: 'completed' })).toBe(false)
    expect(isTaskTerminal({ task_id: 't', status: 'cancelled' })).toBe(true)

    const getStatus = vi.fn().mockResolvedValue({ task_id: 't', status: 'cancelled' })
    const delay = vi.fn().mockResolvedValue(undefined)

    const result = await pollTaskStatus(
      't',
      { maxAttempts: 30, intervalMs: 1 },
      { getStatus, delay },
    )

    expect(getStatus).toHaveBeenCalledTimes(1)
    expect(delay).not.toHaveBeenCalled()
    expect(result.status).toBe('cancelled')
  })
})
