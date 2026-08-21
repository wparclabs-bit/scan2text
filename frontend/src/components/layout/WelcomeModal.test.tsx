import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WelcomeModal from './WelcomeModal'
import { buildApiUrl } from '@/lib/apiBase'
import { initI18n } from '@/i18n'
import en from '@/locales/en.json'
import id from '@/locales/id.json'

describe('WelcomeModal', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
    initI18n({ en: { translation: en } })
  })

  it('renders when hide_welcome_notice is false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ hide_welcome_notice: false }),
    })
    render(<WelcomeModal />)
    await waitFor(() => {
      expect(screen.getByText('Welcome to Scan2Text')).toBeInTheDocument()
    })
  })

  it('does not render when hide_welcome_notice is true', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ hide_welcome_notice: true }),
    })
    const { container } = render(<WelcomeModal />)
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('renders welcome body with 20MB limit copy', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ hide_welcome_notice: false }),
    })
    render(<WelcomeModal />)
    await waitFor(() => {
      const modal = document.querySelector('[data-testid="welcome-modal"]') as HTMLElement | null
      expect(modal).toBeInTheDocument()
      expect(modal!.textContent).toContain('Turn your scanned documents')
      expect(modal!.textContent).toContain('20MB')
      expect(modal!.textContent).toContain('50 pages')
    })
  })

  it('checkbox toggles state', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ hide_welcome_notice: false }),
    })
    render(<WelcomeModal />)
    await waitFor(() => {
      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement
    expect(checkbox).not.toBeChecked()
    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()
  })

  it('calls PUT /api/settings when "Don\'t show again" is checked', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ hide_welcome_notice: false }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ hide_welcome_notice: true }),
      })
    render(<WelcomeModal />)
    await waitFor(() => {
      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement
    fireEvent.click(checkbox)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        buildApiUrl('/api/settings'),
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ hide_welcome_notice: true }),
        })
      )
    })
  })

  it('renders close button with translated text', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ hide_welcome_notice: false }),
    })
    render(<WelcomeModal />)
    await waitFor(() => {
      expect(screen.getByText('Get Started')).toBeInTheDocument()
    })
  })

  it('uses buildApiUrl for /api/settings in prod mode', async () => {
    vi.stubEnv('PROD', true)
    mockFetch.mockReset()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ hide_welcome_notice: false }),
    })
    render(<WelcomeModal />)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('127.0.0.1:47351'))
    })
    vi.unstubAllEnvs()
  })

  describe('Option B: solid theme-aware panel', () => {
    it('light theme: panel className carries light bg and ink tokens', async () => {
      document.documentElement.classList.remove('dark')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ hide_welcome_notice: false }),
      })
      render(<WelcomeModal />)
      await waitFor(() => {
        const panel = document.querySelector('[data-testid="welcome-modal"]') as HTMLElement | null
        expect(panel).toBeInTheDocument()
        expect(panel!.className).toContain('bg-[#F9F8F6]')
        expect(panel!.className).toContain('text-[#1F150C]')
      })
    })

    it('dark theme: panel className carries dark styling unchanged', async () => {
      document.documentElement.classList.add('dark')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ hide_welcome_notice: false }),
      })
      render(<WelcomeModal />)
      await waitFor(() => {
        const panel = document.querySelector('[data-testid="welcome-modal"]') as HTMLElement | null
        expect(panel).toBeInTheDocument()
        expect(panel!.className).toContain('dark:bg-[#080502]')
        expect(panel!.className).toContain('dark:text-[#F2EBDD]')
      })
    })
  })

  describe('Option B: 60% backdrop', () => {
    it('backdrop carries bg-black/60 className', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ hide_welcome_notice: false }),
      })
      render(<WelcomeModal />)
      await waitFor(() => {
        const overlay = Array.from(document.querySelectorAll('div')).find(
          (d) => d.classList.contains('bg-black/60'),
        ) as HTMLElement | undefined
        expect(overlay).toBeInTheDocument()
      })
    })
  })

  describe('Option B: active-language-only bullets', () => {
    it('EN active: EN bullets present, ID bullet text absent from container', async () => {
      initI18n({ en: { translation: en }, id: { translation: id } })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ hide_welcome_notice: false }),
      })
      render(<WelcomeModal />)
      await waitFor(() => {
        const modal = document.querySelector('[data-testid="welcome-modal"]') as HTMLElement | null
        expect(modal).toBeInTheDocument()
        expect(modal!.textContent).toContain('Turn your scanned documents into editable text')
        expect(modal!.textContent).not.toContain('Ubah dokumen hasil scan Anda menjadi teks yang bisa diedit')
      })
    })

    it('ID active: ID bullets present, EN bullet text absent from container', async () => {
      initI18n({ en: { translation: en }, id: { translation: id } })
      const i18next = await import('i18next')
      await i18next.default.changeLanguage('id')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ hide_welcome_notice: false }),
      })
      render(<WelcomeModal />)
      await waitFor(() => {
        const modal = document.querySelector('[data-testid="welcome-modal"]') as HTMLElement | null
        expect(modal).toBeInTheDocument()
        expect(modal!.textContent).toContain('Ubah dokumen hasil scan Anda menjadi teks yang bisa diedit')
        expect(modal!.textContent).not.toContain('Turn your scanned documents into editable text')
      })
    })
  })

  describe('Option B: left-align + bullet styling preserved', () => {
    it('bullet list carries text-left className', async () => {
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

    it('bullet items carry flex items-start gap-2 className', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ hide_welcome_notice: false }),
      })
      render(<WelcomeModal />)
      await waitFor(() => {
        const items = document.querySelectorAll('li')
        expect(items.length).toBeGreaterThan(0)
        items.forEach((item) => {
          expect(item).toHaveClass('flex')
          expect(item).toHaveClass('items-start')
          expect(item).toHaveClass('gap-2')
        })
      })
    })
  })
})
