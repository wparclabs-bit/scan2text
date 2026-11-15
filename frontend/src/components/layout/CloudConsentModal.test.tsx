import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CloudConsentModal from './CloudConsentModal'
import { useConsentStore } from '@/stores/consent.store'
import { initI18n } from '@/i18n'
import en from '@/locales/en.json'
import id from '@/locales/id.json'

const BATCH = {
  id: 'batch-1',
  providerName: 'NVIDIA NIM',
  modelId: 'nvidia/nemotron-3.5-super-vl-120b-a12b',
  region: 'United States',
  fileCount: 3,
  totalSizeBytes: 34 * 1024 * 1024,
}

function renderModal(onDecision = vi.fn()) {
  render(<CloudConsentModal batch={BATCH} open onDecision={onDecision} />)
  return onDecision
}

describe('CloudConsentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    initI18n({ en: { translation: en }, id: { translation: id } })
    useConsentStore.getState().resetConsent()
    useConsentStore.getState().setCloudState({ enabled: true, hasKey: true })
  })

  it('names provider, model, count, total size, region, and traffic recording', async () => {
    renderModal()
    const modal = await screen.findByTestId('cloud-consent-modal')

    expect(modal).toHaveTextContent('NVIDIA NIM')
    expect(modal).toHaveTextContent(BATCH.modelId)
    expect(modal).toHaveTextContent('3')
    expect(modal).toHaveTextContent('United States')
    expect(screen.getByTestId('cloud-consent-region')).toHaveTextContent('United States')
    expect(screen.getByTestId('cloud-consent-file-count')).toHaveTextContent('3')
    expect(screen.getByTestId('cloud-consent-total-size')).toHaveTextContent('34')
    expect(screen.getByTestId('cloud-consent-traffic-notice').textContent).toMatch(/record/i)
  })

  it('send grant is the only path that permits a cloud job', async () => {
    const onDecision = renderModal()
    await screen.findByTestId('cloud-consent-modal')

    fireEvent.click(screen.getByTestId('cloud-consent-send'))

    expect(onDecision).toHaveBeenCalledWith({ granted: true, cpuOverride: false })
    expect(useConsentStore.getState().canUseCloud(BATCH.id)).toBe(true)
  })

  it('cancel denies and permits no cloud job', async () => {
    const onDecision = renderModal()
    await screen.findByTestId('cloud-consent-modal')

    fireEvent.click(screen.getByTestId('cloud-consent-cancel'))

    expect(onDecision).toHaveBeenCalledWith({ granted: false, cpuOverride: false })
    expect(useConsentStore.getState().canUseCloud(BATCH.id)).toBe(false)
  })

  it('cpu checkbox routes the batch locally', async () => {
    const onDecision = renderModal()
    await screen.findByTestId('cloud-consent-modal')

    fireEvent.click(screen.getByTestId('cloud-consent-cpu-checkbox'))
    fireEvent.click(screen.getByTestId('cloud-consent-send'))

    expect(onDecision).toHaveBeenCalledWith({ granted: true, cpuOverride: true })
    expect(useConsentStore.getState().canUseCloud(BATCH.id)).toBe(false)
    expect(useConsentStore.getState().localBatchIds()).toContain(BATCH.id)
  })

  it('never renders or logs a key', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <CloudConsentModal batch={BATCH} open onDecision={vi.fn()} />,
    )
    await screen.findByTestId('cloud-consent-modal')

    expect(container.textContent ?? '').not.toMatch(/sk-[a-z0-9]/i)
    expect(JSON.stringify(logSpy.mock.calls)).not.toMatch(/sk-[a-z0-9]/i)
    expect(JSON.stringify(errorSpy.mock.calls)).not.toMatch(/sk-[a-z0-9]/i)
    expect(JSON.stringify(warnSpy.mock.calls)).not.toMatch(/sk-[a-z0-9]/i)
  })

  it('consent strings exist in english and indonesian', () => {
    const enConsent = en.consent as unknown as Record<string, string>
    const idConsent = id.consent as unknown as Record<string, string>
    const enToast = (en.consent as { toast: Record<string, string> }).toast
    const idToast = (id.consent as { toast: Record<string, string> }).toast

    for (const key of ['title', 'provider', 'model', 'fileCount', 'totalSize', 'region', 'trafficNotice', 'send', 'cancel', 'useCpu']) {
      expect(typeof enConsent[key]).toBe('string')
      expect(typeof idConsent[key]).toBe('string')
      expect(idConsent[key]).not.toBe('')
    }
    expect(enConsent.trafficNotice).toMatch(/record/i)
    expect(idConsent.trafficNotice).toMatch(/rekam|catat/i)
    for (const key of ['needsKey', 'addKey', 'enableCloud', 'cloudDisabled', 'processOnCpu']) {
      expect(typeof enToast[key]).toBe('string')
      expect(typeof idToast[key]).toBe('string')
    }
  })

  it('the needs-key escape toast offers add-a-key and process-on-cpu once per batch', async () => {
    const { toast } = await import('sonner')
    useConsentStore.getState().setCloudState({ enabled: true, hasKey: false })

    render(
      <CloudConsentModal
        batch={BATCH}
        open
        onDecision={vi.fn()}
        onAddKey={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledTimes(1)
    })
    const [message, options] = (toast.info as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(String(message)).toMatch(/API key/i)

    const { container } = render(
      <div data-testid="toast-host">
        {(options as { description: React.ReactElement }).description}
      </div>,
    )
    expect(container.textContent).toMatch(/API key/i)
    expect(container.textContent).toMatch(/CPU/i)
  })

  it('the cloud-disabled escape toast offers enable and process-on-cpu once per batch', async () => {
    const { toast } = await import('sonner')
    useConsentStore.getState().setCloudState({ enabled: false, hasKey: false })

    render(
      <CloudConsentModal
        batch={{ ...BATCH, id: 'batch-disabled' }}
        open
        onDecision={vi.fn()}
        onEnableCloud={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledTimes(1)
    })
    const [message, options] = (toast.info as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(String(message)).toMatch(/Cloud engine/i)

    const { container } = render(
      <div data-testid="toast-host">
        {(options as { description: React.ReactElement }).description}
      </div>,
    )
    expect(container.textContent).toMatch(/Cloud engine/i)
    expect(container.textContent).toMatch(/CPU/i)
  })
})
