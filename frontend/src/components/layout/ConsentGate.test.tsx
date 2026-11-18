import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ConsentGate from './ConsentGate'
import { useConsentStore } from '@/stores/consent.store'
import { useScan2TextStore } from '@/stores/scan2text.store'
import { initI18n } from '@/i18n'
import en from '@/locales/en.json'
import id from '@/locales/id.json'

const MEGABYTE = 1024 * 1024

const PROFILE = {
  name: 'Cloud Profile',
  beta: true,
  enabled: true,
  base_url: 'https://provider.example/v1',
  model_id: 'vision-model',
  region: 'United States',
  recipe: {
    version: 'cloud-v1-test',
    prompt: 'Transcribe exactly.',
    temperature: 0.6,
    top_p: 0.95,
    thinking_enabled: false,
  },
  cost_estimate: {
    prompt_tokens_per_page: 2167,
    completion_tokens_per_page: 381,
    pages_per_document: 30,
    input_usd_per_million_tokens: 0.2,
    output_usd_per_million_tokens: 0.5,
    estimated_cost_usd: 0.0187,
    measured_on: '2026-11-15',
    basis: 'T01 measured band',
  },
  credential: { key_id: 'cloud-provider', last_four: 'ture' },
}

function addCloudFile(id: string) {
  useScan2TextStore.setState((state) => ({
    jobs: {
      ...state.jobs,
      [id]: {
        ...state.jobs[id],
        id,
        fileName: 'large.pdf',
        fileSize: 12 * MEGABYTE,
        fileType: 'application/pdf',
        taskId: null,
        status: 'pending',
        isBackground: false,
        createdAt: Date.now(),
        resultMarkdown: null,
        markdownOutput: '',
        error: null,
        errorCode: null,
        file: null,
        progress: 0,
        consecutiveHealthFailures: 0,
        metaSize: 12 * MEGABYTE,
      } as never,
    },
    jobOrder: [...state.jobOrder, id],
  }))
}

describe('ConsentGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    initI18n({ en: { translation: en } })
    useConsentStore.getState().resetConsent()
    useScan2TextStore.setState({ jobs: {}, jobOrder: [], activeJobId: null, selectedJobId: null })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(PROFILE),
      }),
    )
  })

  it('opens the consent modal when a cloud-routed file lands with a key configured', async () => {
    render(<ConsentGate />)
    await waitFor(() => expect(useConsentStore.getState().cloudHasKey).toBe(true))

    addCloudFile('job-large')

    expect(await screen.findByTestId('cloud-consent-modal')).toBeInTheDocument()
    expect(screen.getByTestId('cloud-consent-region')).toHaveTextContent('United States')
  })

  it('estimated_cost_appears_before_send_with_the_existing_consent_facts', async () => {
    render(<ConsentGate />)
    await waitFor(() => expect(useConsentStore.getState().cloudHasKey).toBe(true))

    addCloudFile('job-large')

    expect(await screen.findByTestId('cloud-consent-modal')).toBeInTheDocument()
    expect(screen.getByTestId('cloud-consent-estimated-cost')).toHaveTextContent('$0.0187')
    expect(screen.getByTestId('cloud-consent-cost-disclaimer')).toHaveTextContent(
      'published list price, not an invoice',
    )
    expect(screen.getByTestId('cloud-consent-provider')).toHaveTextContent('Cloud Profile')
    expect(screen.getByTestId('cloud-consent-model')).toHaveTextContent('vision-model')
    expect(screen.getByTestId('cloud-consent-file-count')).toHaveTextContent('1')
    expect(screen.getByTestId('cloud-consent-total-size')).toHaveTextContent('12.0 MB')
    expect(screen.getByTestId('cloud-consent-region')).toHaveTextContent('United States')
    expect(screen.getByTestId('cloud-consent-traffic-notice')).toBeInTheDocument()
  })

  it('cost_wording_exists_in_english_and_indonesian', () => {
    expect(en).toHaveProperty('consent.estimatedCost')
    expect(en).toHaveProperty('cloudCost.estimateNotice')
    expect(id).toHaveProperty('consent.estimatedCost')
    expect(id).toHaveProperty('cloudCost.estimateNotice')
  })

  it('does not open the modal for a batch that stays on the local engine', async () => {
    render(<ConsentGate />)
    await waitFor(() => expect(useConsentStore.getState().cloudEnabled).toBe(true))

    useScan2TextStore.setState((state) => ({
      jobs: {
        ...state.jobs,
        'job-small': {
          id: 'job-small',
          fileName: 'small.pdf',
          fileSize: 2 * MEGABYTE,
          fileType: 'application/pdf',
          taskId: null,
          status: 'pending',
          isBackground: false,
          createdAt: Date.now(),
          resultMarkdown: null,
          markdownOutput: '',
          error: null,
          errorCode: null,
          file: null,
          progress: 0,
          consecutiveHealthFailures: 0,
        } as never,
      },
      jobOrder: [...state.jobOrder, 'job-small'],
    }))

    await waitFor(() => expect(useConsentStore.getState().sessionConsentGranted).toBe(false))
    expect(screen.queryByTestId('cloud-consent-modal')).toBeNull()
  })
})
