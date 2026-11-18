import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCloudSpendStore } from './cloudSpend.store'

describe('cloudSpend store', () => {
  beforeEach(() => {
    useCloudSpendStore.getState().reset()
  })

  it('session_total_starts_at_zero', () => {
    expect(useCloudSpendStore.getState().sessionSpendUsd).toBe(0)
  })

  it('completed_job_cost_is_added_once', () => {
    const store = useCloudSpendStore.getState()
    store.setJobEstimate('job-1', 0.0187)

    useCloudSpendStore.getState().recordCompletedJob('job-1')
    useCloudSpendStore.getState().recordCompletedJob('job-1')

    expect(useCloudSpendStore.getState().sessionSpendUsd).toBeCloseTo(0.0187, 6)
  })

  it('spend_is_never_written_to_browser_storage', () => {
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem')

    useCloudSpendStore.getState().setJobEstimate('job-1', 0.0187)
    useCloudSpendStore.getState().recordCompletedJob('job-1')
    useCloudSpendStore.getState().reset()

    expect(storageWrite).not.toHaveBeenCalled()
  })
})
