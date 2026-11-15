import { create } from 'zustand'

/**
 * Consent gate state for Cloud jobs.
 *
 * Memory only. The once-per-session consent flag, the per-batch CPU override,
 * and every batch decision live in this store and nowhere else: no browser
 * storage, no settings file, and no secret of any kind.
 */

export type ConsentGate = 'cloud-enabled' | 'needs-key' | 'cloud-disabled'

export interface ConsentBatchSummary {
  id: string
  providerName: string
  modelId: string
  region: string
  fileCount: number
  totalSizeBytes: number
}

export interface EnsureConsentOptions {
  /** False for a batch that routes entirely to the Local engine. */
  hasCloudRoutedFiles?: boolean
}

export interface ConsentRequest {
  ask: boolean
  gate: ConsentGate
}

export interface ConsentDecision {
  granted: boolean
  cpuOverride?: boolean
}

interface BatchDecision {
  granted: boolean
}

interface ConsentState {
  cloudEnabled: boolean
  cloudHasKey: boolean
  sessionConsentGranted: boolean
  batchDecisions: Record<string, BatchDecision>
  cpuOverrides: Record<string, true>
  /** Batches whose one escape toast has already been shown. Never persisted. */
  escapeNotifiedBatches: Record<string, true>
  setCloudState: (input: { enabled: boolean; hasKey: boolean }) => void
  resolveConsentGate: () => ConsentGate
  ensureConsent: (batchId: string, options?: EnsureConsentOptions) => ConsentRequest
  decideConsent: (batchId: string, decision: ConsentDecision) => void
  setBatchCpuOverride: (batchId: string, override: boolean) => void
  markEscapeNotified: (batchId: string) => boolean
  canUseCloud: (batchId: string) => boolean
  localBatchIds: () => string[]
  resetConsent: () => void
}

const initialConsentState = {
  cloudEnabled: false,
  cloudHasKey: false,
  sessionConsentGranted: false,
  batchDecisions: {} as Record<string, BatchDecision>,
  cpuOverrides: {} as Record<string, true>,
  escapeNotifiedBatches: {} as Record<string, true>,
}

export const useConsentStore = create<ConsentState>((set, get) => ({
  ...initialConsentState,

  setCloudState: ({ enabled, hasKey }) => {
    set({ cloudEnabled: enabled, cloudHasKey: hasKey })
  },

  resolveConsentGate: () => {
    const { cloudEnabled, cloudHasKey } = get()
    if (!cloudEnabled) return 'cloud-disabled'
    if (!cloudHasKey) return 'needs-key'
    return 'cloud-enabled'
  },

  ensureConsent: (batchId, options = {}) => {
    const state = get()
    const gate = state.resolveConsentGate()
    if (state.cpuOverrides[batchId]) {
      return { ask: false, gate }
    }
    if (options.hasCloudRoutedFiles === false) {
      return { ask: false, gate }
    }
    if (gate !== 'cloud-enabled') {
      return { ask: false, gate }
    }
    if (state.sessionConsentGranted || state.batchDecisions[batchId]) {
      return { ask: false, gate }
    }
    return { ask: true, gate }
  },

  decideConsent: (batchId, decision) => {
    set((state) => ({
      sessionConsentGranted:
        state.sessionConsentGranted || (decision.granted && !decision.cpuOverride),
      batchDecisions: {
        ...state.batchDecisions,
        [batchId]: { granted: decision.granted && !decision.cpuOverride },
      },
      cpuOverrides: decision.cpuOverride
        ? { ...state.cpuOverrides, [batchId]: true as const }
        : state.cpuOverrides,
    }))
  },

  setBatchCpuOverride: (batchId, override) => {
    set((state) => {
      const next = { ...state.cpuOverrides }
      if (override) {
        next[batchId] = true
      } else {
        delete next[batchId]
      }
      return { cpuOverrides: next }
    })
  },

  markEscapeNotified: (batchId) => {
    if (get().escapeNotifiedBatches[batchId]) return false
    set((state) => ({
      escapeNotifiedBatches: { ...state.escapeNotifiedBatches, [batchId]: true as const },
    }))
    return true
  },

  canUseCloud: (batchId) => {
    const state = get()
    if (state.resolveConsentGate() !== 'cloud-enabled') return false
    if (state.cpuOverrides[batchId]) return false
    return state.batchDecisions[batchId]?.granted === true
  },

  localBatchIds: () => Object.keys(get().cpuOverrides),

  resetConsent: () => {
    set({ ...initialConsentState })
  },
}))
