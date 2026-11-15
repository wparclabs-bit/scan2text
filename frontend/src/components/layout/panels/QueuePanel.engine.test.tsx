import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QueuePanel from './QueuePanel'
import { initI18n } from '@/i18n'
import en from '@/locales/en.json'
import id from '@/locales/id.json'

vi.mock('@/stores/scan2text.store', () => ({
  useScan2TextStore: vi.fn(),
}))

vi.mock('@/lib/cleanupObjectURLs', () => ({
  cleanupObjectURLs: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  getCloudProfile: vi.fn(),
}))

const { useScan2TextStore } = await import('@/stores/scan2text.store')
const { getCloudProfile } = await import('@/lib/api')

const PROFILE_MODEL_ID = 'nvidia/nemotron-3.5-super-vl-120b-a12b'
const JOB_MODEL_ID = 'nvidia/job-level-model'

describe('QueuePanel cloud engine indicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    initI18n({ en: { translation: en }, id: { translation: id } })
    ;(getCloudProfile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: 'NVIDIA NIM',
      model_id: PROFILE_MODEL_ID,
      enabled: true,
      region: 'United States',
    })
  })

  function setupStore(jobs: Record<string, any>, selectedJobId: string | null = null) {
    ;(useScan2TextStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (state: any) => any) => {
        const state = { jobs, selectedJobId, retryJob: vi.fn(), setSelectedJobId: vi.fn() }
        return selector(state)
      },
    )
  }

  function cloudJob(overrides: Record<string, any> = {}) {
    return {
      id: 'job-1',
      fileName: 'large.pdf',
      fileSize: 12 * 1024 * 1024,
      status: 'completed',
      createdAt: 1000,
      engine: 'cloud',
      ...overrides,
    }
  }

  it('test_queue_row_shows_the_cloud_icon_with_a_tooltip_naming_the_engine_and_the_model', async () => {
    // No model on the job: the profile model id is the fallback, never an invented name.
    setupStore({ 'job-1': cloudJob() })
    render(<QueuePanel />)

    const icon = screen.getByTestId('queue-item-engine-icon')
    await userEvent.hover(icon)
    const tooltip = await screen.findByTestId('queue-item-engine-tooltip')

    expect(tooltip.textContent).toContain('Cloud engine')
    expect(tooltip.textContent).toContain(PROFILE_MODEL_ID)
    expect(getCloudProfile).toHaveBeenCalled()

    // A model already known on the job wins and no profile read is needed.
    cleanup()
    ;(getCloudProfile as unknown as ReturnType<typeof vi.fn>).mockClear()
    setupStore({ 'job-1': cloudJob({ cloudModelId: JOB_MODEL_ID }) })
    render(<QueuePanel />)

    await userEvent.hover(screen.getByTestId('queue-item-engine-icon'))
    const jobTooltip = await screen.findByTestId('queue-item-engine-tooltip')
    expect(jobTooltip.textContent).toContain(JOB_MODEL_ID)
    expect(getCloudProfile).not.toHaveBeenCalled()

    // A local (or engine-less) job shows no engine icon at all.
    cleanup()
    setupStore({ 'job-1': cloudJob({ engine: 'local' }) })
    render(<QueuePanel />)
    expect(screen.queryByTestId('queue-item-engine-icon')).not.toBeInTheDocument()
  })

  it('test_status_dot_keeps_status_meaning_and_never_names_the_engine', async () => {
    setupStore({ 'job-1': cloudJob() })
    render(<QueuePanel />)

    const dot = screen.getByTestId('queue-item-status-dot')
    await userEvent.hover(dot)
    const statusTooltip = await screen.findByTestId('queue-item-status-tooltip')

    expect(statusTooltip.textContent).toBe('Completed')
    expect(statusTooltip.textContent).not.toContain('Cloud')
    expect(statusTooltip.textContent).not.toContain(PROFILE_MODEL_ID)
  })
})
