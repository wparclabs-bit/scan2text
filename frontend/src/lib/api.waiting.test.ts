import { describe, it, expect, vi } from 'vitest'
import {
  TASK_STATUSES,
  isTaskWaiting,
  isTaskTerminal,
  pollTaskStatus,
} from './api'

describe('T05 — waiting status in the API seam', () => {
  it('test_is_task_waiting_recognises_the_waiting_status', () => {
    expect(isTaskWaiting({ task_id: 't', status: 'waiting', reason: 'network' })).toBe(true)
    expect(isTaskWaiting({ task_id: 't', status: 'failed' })).toBe(false)
  })

  it('test_waiting_reason_is_exposed_on_the_response', () => {
    const response = {
      task_id: 't',
      status: 'waiting',
      reason: 'rateLimited',
      error_code: 'RATE_LIMITED',
    }
    expect(isTaskWaiting(response)).toBe(true)
    expect(isTaskTerminal(response)).toBe(true)
    if (isTaskWaiting(response)) {
      expect(response.reason).toBe('rateLimited')
    }
  })

  it('test_polling_stops_at_a_waiting_terminal_state', async () => {
    const getStatus = vi.fn().mockResolvedValue({
      task_id: 't',
      status: 'waiting',
      reason: 'network',
      error_code: 'NETWORK_UNAVAILABLE',
    })
    const delay = vi.fn().mockResolvedValue(undefined)

    const result = await pollTaskStatus(
      't',
      { maxAttempts: 30, intervalMs: 1 },
      { getStatus, delay },
    )

    expect(getStatus).toHaveBeenCalledTimes(1)
    expect(delay).not.toHaveBeenCalled()
    expect(result.status).toBe('waiting')
  })

  it('the shared status set holds exactly the six canonical values', () => {
    expect([...TASK_STATUSES].sort()).toEqual([
      'completed',
      'failed',
      'processing',
      'queued',
      'skipped',
      'waiting',
    ])
  })
})
