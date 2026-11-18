import { create } from 'zustand'

/**
 * Cloud spend visibility state.
 *
 * Memory only: estimates, completed job ids, and the session total never leave
 * this store and are never written to browser storage.
 */
interface CloudSpendState {
  sessionSpendUsd: number
  jobEstimates: Record<string, number>
  completedJobIds: Record<string, true>
  recordedJobIds: Record<string, true>
  setJobEstimate: (jobId: string, estimatedCostUsd: number) => void
  recordCompletedJob: (jobId: string) => void
  reset: () => void
}

const initialState = {
  sessionSpendUsd: 0,
  jobEstimates: {} as Record<string, number>,
  completedJobIds: {} as Record<string, true>,
  recordedJobIds: {} as Record<string, true>,
}

export const useCloudSpendStore = create<CloudSpendState>((set, get) => ({
  ...initialState,

  setJobEstimate: (jobId, estimatedCostUsd) => {
    set((state) => ({
      jobEstimates: { ...state.jobEstimates, [jobId]: estimatedCostUsd },
    }))

    const state = get()
    if (
      state.completedJobIds[jobId] &&
      !state.recordedJobIds[jobId] &&
      state.jobEstimates[jobId] !== undefined
    ) {
      set((current) => ({
        sessionSpendUsd: current.sessionSpendUsd + current.jobEstimates[jobId],
        recordedJobIds: { ...current.recordedJobIds, [jobId]: true },
      }))
    }
  },

  recordCompletedJob: (jobId) => {
    set((state) => ({
      completedJobIds: { ...state.completedJobIds, [jobId]: true },
    }))

    const state = get()
    if (
      !state.recordedJobIds[jobId] &&
      state.jobEstimates[jobId] !== undefined
    ) {
      set((current) => ({
        sessionSpendUsd: current.sessionSpendUsd + current.jobEstimates[jobId],
        recordedJobIds: { ...current.recordedJobIds, [jobId]: true },
      }))
    }
  },

  reset: () => {
    set({ ...initialState })
  },
}))
