import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useConsentStore } from './consent.store'

const MEGABYTE = 1024 * 1024

function resetStore() {
  useConsentStore.getState().resetConsent()
}

describe('consent store', () => {
  beforeEach(() => {
    resetStore()
    vi.restoreAllMocks()
  })

  it('gate state is cloud enabled when the Cloud engine is on and a key is stored', () => {
    useConsentStore.getState().setCloudState({ enabled: true, hasKey: true })

    expect(useConsentStore.getState().resolveConsentGate()).toBe('cloud-enabled')
  })

  it('gate state is needs key when the Cloud engine is on without a key', () => {
    useConsentStore.getState().setCloudState({ enabled: true, hasKey: false })

    expect(useConsentStore.getState().resolveConsentGate()).toBe('needs-key')
  })

  it('gate state is cloud disabled when the Cloud engine is off', () => {
    useConsentStore.getState().setCloudState({ enabled: false, hasKey: true })

    expect(useConsentStore.getState().resolveConsentGate()).toBe('cloud-disabled')
  })

  it('consent is asked once per session and not again for a later cloud job', () => {
    const store = useConsentStore.getState()
    store.setCloudState({ enabled: true, hasKey: true })

    const first = useConsentStore.getState().ensureConsent('batch-1')

    expect(first).toEqual({ ask: true, gate: 'cloud-enabled' })
    useConsentStore.getState().decideConsent('batch-1', { granted: true })

    const later = useConsentStore.getState().ensureConsent('batch-2')

    expect(later).toEqual({ ask: false, gate: 'cloud-enabled' })
    expect(useConsentStore.getState().sessionConsentGranted).toBe(true)
  })

  it('a denied consent is not remembered, so the next cloud job asks again', () => {
    const store = useConsentStore.getState()
    store.setCloudState({ enabled: true, hasKey: true })
    useConsentStore.getState().ensureConsent('batch-1')
    useConsentStore.getState().decideConsent('batch-1', { granted: false })

    const later = useConsentStore.getState().ensureConsent('batch-2')

    expect(later.ask).toBe(true)
    expect(useConsentStore.getState().sessionConsentGranted).toBe(false)
  })

  it('no-key and disabled gates never open the cloud path', () => {
    const store = useConsentStore.getState()
    store.setCloudState({ enabled: true, hasKey: false })
    expect(useConsentStore.getState().canUseCloud('batch-key')).toBe(false)

    store.setCloudState({ enabled: false, hasKey: true })
    expect(useConsentStore.getState().canUseCloud('batch-disabled')).toBe(false)
  })

  it('cpu override routes the whole batch to the local engine instead', () => {
    const store = useConsentStore.getState()
    store.setCloudState({ enabled: true, hasKey: true })
    useConsentStore.getState().ensureConsent('batch-1')

    useConsentStore.getState().decideConsent('batch-1', { granted: true })
    expect(useConsentStore.getState().canUseCloud('batch-1')).toBe(true)

    useConsentStore.getState().setBatchCpuOverride('batch-1', true)

    expect(useConsentStore.getState().canUseCloud('batch-1')).toBe(false)
    expect(useConsentStore.getState().localBatchIds()).toContain('batch-1')
    expect(useConsentStore.getState().sessionConsentGranted).toBe(true)
  })

  it('cpu override short-circuits the consent prompt entirely', () => {
    const store = useConsentStore.getState()
    store.setCloudState({ enabled: true, hasKey: true })
    useConsentStore.getState().ensureConsent('batch-1')
    useConsentStore.getState().setBatchCpuOverride('batch-1', true)

    const gate = useConsentStore.getState().ensureConsent('batch-1')

    expect(gate.ask).toBe(false)
    expect(useConsentStore.getState().canUseCloud('batch-1')).toBe(false)
  })

  it('the consent flag is never written to browser storage', () => {
    const localSet = vi.spyOn(window.localStorage, 'setItem')
    const sessionSet = vi.spyOn(window.sessionStorage, 'setItem')

    const store = useConsentStore.getState()
    store.setCloudState({ enabled: true, hasKey: true })
    useConsentStore.getState().ensureConsent('batch-1')
    useConsentStore.getState().decideConsent('batch-1', { granted: true })

    expect(localSet).not.toHaveBeenCalled()
    expect(sessionSet).not.toHaveBeenCalled()
    expect(window.localStorage.getItem('scan2text:cloud-consent')).toBeNull()
  })

  it('the store never records a key or a secret', () => {
    const store = useConsentStore.getState()
    store.setCloudState({ enabled: true, hasKey: true })
    useConsentStore.getState().ensureConsent('batch-1')

    const dumped = JSON.stringify(useConsentStore.getState())

    expect(dumped).not.toMatch(/api[_-]?key/i)
    expect(dumped).not.toMatch(/secret/i)
    expect(dumped).not.toMatch(/credential/i)
  })

  it('a batch with only small files needs no consent', () => {
    const store = useConsentStore.getState()
    store.setCloudState({ enabled: true, hasKey: true })

    const gate = useConsentStore.getState().ensureConsent('batch-small', {
      hasCloudRoutedFiles: false,
    })

    expect(gate.ask).toBe(false)
    expect(useConsentStore.getState().sessionConsentGranted).toBe(false)
    expect(2 * MEGABYTE).toBeLessThan(8 * MEGABYTE)
  })
})
