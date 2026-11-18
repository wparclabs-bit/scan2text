import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QueuePanel from './QueuePanel'
import { initI18n, i18n } from '@/i18n'
import en from '@/locales/en.json'
import id from '@/locales/id.json'

vi.mock('@/stores/scan2text.store', () => ({
  useScan2TextStore: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  getCloudProfile: vi.fn().mockResolvedValue({ model_id: 'vision-model' }),
}))

const { useScan2TextStore } = await import('@/stores/scan2text.store')

describe('T06 — the cancel control in the queue row', () => {
  const cancelJob = vi.fn()
  const retryJob = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    initI18n({ en: { translation: en }, id: { translation: id } })
    void i18n.changeLanguage('en')
  })

  function setupStore(job: Record<string, unknown>) {
    ;(useScan2TextStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (state: any) => any) => {
        const state = {
          jobs: {
            j1: {
              id: 'j1',
              fileName: 'large.pdf',
              fileSize: 12 * 1024 * 1024,
              createdAt: 1000,
              ...job,
            },
          },
          selectedJobId: null,
          retryJob,
          cancelJob,
          setSelectedJobId: vi.fn(),
        }
        return selector(state)
      },
    )
  }

  it('test_the_cancel_control_appears_only_for_a_running_cloud_job', async () => {
    setupStore({ status: 'processing', engine: 'cloud' })
    render(<QueuePanel />)

    const button = screen.getByTestId('queue-item-cancel')
    expect(button).toBeTruthy()
    await userEvent.click(button)
    expect(cancelJob).toHaveBeenCalledWith('j1')

    cleanup()
    setupStore({ status: 'completed', engine: 'cloud' })
    render(<QueuePanel />)
    expect(screen.queryByTestId('queue-item-cancel')).toBeNull()

    cleanup()
    setupStore({ status: 'processing', engine: 'local' })
    render(<QueuePanel />)
    expect(screen.queryByTestId('queue-item-cancel')).toBeNull()
  })

  it('test_the_cancelled_job_tooltip_says_the_provider_may_still_finish_and_charge', async () => {
    setupStore({ status: 'cancelled', engine: 'cloud' })
    render(<QueuePanel />)
    await userEvent.hover(screen.getByTestId('queue-item-status-dot'))
    const enTooltip = await screen.findByTestId('queue-item-status-tooltip')
    expect(enTooltip.textContent).toContain('may still finish')
    expect(enTooltip.textContent).toContain('charge')

    cleanup()
    void i18n.changeLanguage('id')
    setupStore({ status: 'cancelled', engine: 'cloud' })
    render(<QueuePanel />)
    await userEvent.hover(screen.getByTestId('queue-item-status-dot'))
    const idTooltip = await screen.findByTestId('queue-item-status-tooltip')
    expect(idTooltip.textContent).toContain('masih menyelesaikan')
    expect(idTooltip.textContent).toContain('biaya')
  })

  it('test_a_parked_job_keeps_its_retry_button', () => {
    setupStore({ status: 'waiting', reason: 'network', engine: 'cloud' })
    render(<QueuePanel />)

    expect(screen.getByTestId('queue-item-retry')).toBeTruthy()
    expect(screen.queryByTestId('queue-item-cancel')).toBeNull()
  })
})
