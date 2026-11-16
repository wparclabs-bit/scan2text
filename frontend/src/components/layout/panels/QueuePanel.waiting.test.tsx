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
  getCloudProfile: vi.fn(),
}))

const { useScan2TextStore } = await import('@/stores/scan2text.store')

describe('T05 — the waiting queue row', () => {
  const retryJob = vi.fn().mockResolvedValue('j1')

  beforeEach(() => {
    vi.clearAllMocks()
    initI18n({ en: { translation: en }, id: { translation: id } })
    void i18n.changeLanguage('en')
  })

  function setupStore(reason = 'network') {
    ;(useScan2TextStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (state: any) => any) => {
        const state = {
          jobs: {
            j1: {
              id: 'j1',
              fileName: 'large.pdf',
              fileSize: 12 * 1024 * 1024,
              status: 'waiting',
              reason,
              errorCode: 'NETWORK_UNAVAILABLE',
              createdAt: 1000,
            },
          },
          selectedJobId: null,
          retryJob,
          setSelectedJobId: vi.fn(),
        }
        return selector(state)
      },
    )
  }

  it('test_waiting_dot_uses_the_matte_amber_brown_colour', () => {
    setupStore()
    render(<QueuePanel />)
    const dot = screen.getByTestId('queue-item-status-dot')
    expect(dot.getAttribute('style')).toContain('#B45309')
  })

  it('test_waiting_tooltip_shows_the_reason_sentence_in_english_and_indonesian', async () => {
    setupStore('network')
    render(<QueuePanel />)
    await userEvent.hover(screen.getByTestId('queue-item-status-dot'))
    const enTooltip = await screen.findByTestId('queue-item-status-tooltip')
    expect(enTooltip.textContent).toContain('network is unavailable')
    expect(enTooltip.textContent).not.toContain('NETWORK_UNAVAILABLE')

    cleanup()
    void i18n.changeLanguage('id')
    setupStore('network')
    render(<QueuePanel />)
    await userEvent.hover(screen.getByTestId('queue-item-status-dot'))
    const idTooltip = await screen.findByTestId('queue-item-status-tooltip')
    expect(idTooltip.textContent).toContain('Jaringan tidak tersedia')
  })

  it('test_waiting_row_shows_a_retry_button', async () => {
    setupStore()
    render(<QueuePanel />)
    const button = screen.getByTestId('queue-item-retry')
    expect(button.textContent).toBeTruthy()
    await userEvent.click(button)
    expect(retryJob).toHaveBeenCalledWith('j1')
  })
})
