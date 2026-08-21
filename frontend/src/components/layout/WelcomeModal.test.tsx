import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WelcomeModal from './WelcomeModal'
import { buildApiUrl } from '@/lib/apiBase'
import { initI18n } from '@/i18n'
import en from '@/locales/en.json'

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
})
