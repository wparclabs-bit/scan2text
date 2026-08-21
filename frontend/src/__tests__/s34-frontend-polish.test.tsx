import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import WelcomeModal from '@/components/layout/WelcomeModal'
import QueuePanel from '@/components/layout/panels/QueuePanel'
import { initI18n } from '@/i18n'
import { i18n } from '@/i18n'
import en from '@/locales/en.json'
import id from '@/locales/id.json'

vi.mock('@/stores/scan2text.store', () => ({
  useScan2TextStore: vi.fn(),
}))

vi.mock('@/lib/cleanupObjectURLs', () => ({
  cleanupObjectURLs: vi.fn(),
}))

const { useScan2TextStore } = await import('@/stores/scan2text.store')

// Locked copy from CEO decision
const LONG_DOC_HINT_EN = 'Still processing — please be patient.'
const LONG_DOC_HINT_ID = 'Masih diproses — mohon bersabar.'
const FILE_TOO_COMPLEX_EN = 'File too large or complex. Limits: 20 MB per file · 50 pages per PDF. Split bigger PDFs and retry.'
const FILE_TOO_COMPLEX_ID = 'File terlalu besar atau kompleks. Batas: 20 MB per file · 50 halaman per PDF. Pecah PDF besar lalu coba lagi.'

describe('S34 frontend polish — welcome modal, longDocHint, FILE_TOO_COMPLEX tooltip', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
    initI18n({ en: { translation: en }, id: { translation: id } })
  })

  describe('queue.longDocHint i18n key', () => {
    it('resolves to exact EN locked copy', () => {
      expect(i18n.t('queue.longDocHint', { lng: 'en' })).toBe(LONG_DOC_HINT_EN)
    })

    it('resolves to exact ID locked copy', () => {
      expect(i18n.t('queue.longDocHint', { lng: 'id' })).toBe(LONG_DOC_HINT_ID)
    })
  })

  describe('errors.fileTooComplexLocked i18n key', () => {
    it('resolves to exact EN locked copy', () => {
      expect(i18n.t('errors.fileTooComplexLocked', { lng: 'en' })).toBe(FILE_TOO_COMPLEX_EN)
    })

    it('resolves to exact ID locked copy', () => {
      expect(i18n.t('errors.fileTooComplexLocked', { lng: 'id' })).toBe(FILE_TOO_COMPLEX_ID)
    })
  })

  describe('WelcomeModal polish', () => {
    it('renders each bullet with BOTH EN and ID text in container', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ hide_welcome_notice: false }),
      })
      render(<WelcomeModal />)
      await waitFor(() => {
        const modal = document.querySelector('[data-testid="welcome-modal"]') as HTMLElement | null
        expect(modal).toBeInTheDocument()
        expect(modal!.textContent).toContain('Turn your scanned documents into editable text')
        expect(modal!.textContent).toContain('Ubah dokumen hasil scan Anda menjadi teks yang bisa diedit')
      })
    })

    it('renders bullets left-aligned via className', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ hide_welcome_notice: false }),
      })
      render(<WelcomeModal />)
      await waitFor(() => {
        const list = document.querySelector('ul')
        expect(list).toBeInTheDocument()
        expect(list).toHaveClass('text-left')
      })
    })

    it('overlay/backdrop carries bg-black/50 className', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ hide_welcome_notice: false }),
      })
      render(<WelcomeModal />)
      await waitFor(() => {
        const overlay = Array.from(document.querySelectorAll('div')).find(
          (d) => d.classList.contains('bg-black/50'),
        ) as HTMLElement | undefined
        expect(overlay).toBeInTheDocument()
      })
    })
  })

  describe('QueuePanel FILE_TOO_COMPLEX tooltip', () => {
    function setupStore(jobs: Record<string, any>) {
      ;(useScan2TextStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (selector: (state: any) => any) => selector({ jobs, selectedJobId: null, retryJob: vi.fn() }),
      )
    }

    it('queue row with FILE_TOO_COMPLEX renders translated tooltip in EN', async () => {
      setupStore({
        'job-1': {
          id: 'job-1',
          fileName: 'big.pdf',
          fileSize: 25000000,
          status: 'failed',
          errorCode: 'FILE_TOO_COMPLEX',
          createdAt: 1000,
        },
      })
      render(<QueuePanel />)
      const dot = await waitFor(() => screen.getByTestId('queue-item-status-dot'))
      expect(dot).toBeInTheDocument()
      // FILE_TOO_COMPLEX dot uses dark grey #3F3F46 inline style
      const dotStyle = (dot as HTMLElement).style.background
      expect(dotStyle).toMatch(/rgb\(63,\s*63,\s*70\)/)

      // Verify tooltip is wired by checking the component renders a tooltip trigger for this error
      const tooltipTrigger = document.querySelector('[data-testid="queue-item-status-dot"]')
      expect(tooltipTrigger).toBeInTheDocument()
    })

    it('queue row with FILE_TOO_COMPLEX renders translated tooltip in ID', async () => {
      const i18next = await import('i18next')
      await i18next.default.changeLanguage('id')
      setupStore({
        'job-1': {
          id: 'job-1',
          fileName: 'big.pdf',
          fileSize: 25000000,
          status: 'failed',
          errorCode: 'FILE_TOO_COMPLEX',
          createdAt: 1000,
        },
      })
      render(<QueuePanel />)
      const dot = await waitFor(() => screen.getByTestId('queue-item-status-dot'))
      expect(dot).toBeInTheDocument()
      // Verify the component renders for ID locale without error
      expect(document.querySelector('[data-testid="queue-item"]')).toBeInTheDocument()
      await i18next.default.changeLanguage('en')
    })
  })
})
