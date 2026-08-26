import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import FeedbackButton from './FeedbackButton'

const mockShellOpen = vi.fn()

vi.mock('@tauri-apps/plugin-shell', () => ({
  open: vi.fn((url: string) => mockShellOpen(url)),
}))

const FEEDBACK_FORM_URL = 'https://forms.gle/dJ2tLYzuffp31mHE7'

describe('FeedbackButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders icon-only button with tooltip', () => {
    Object.defineProperty(window, 'navigator', {
      value: { onLine: true },
      writable: true,
    })
    render(<FeedbackButton />)
    expect(screen.getByTestId('feedback-button')).toBeInTheDocument()
  })

  it('calls shell.open with Google Form URL when online', async () => {
    Object.defineProperty(window, 'navigator', {
      value: { onLine: true },
      writable: true,
    })
    render(<FeedbackButton />)
    const btn = screen.getByTestId('feedback-button') as HTMLButtonElement
    btn.click()
    await vi.waitFor(() => {
      expect(mockShellOpen).toHaveBeenCalledWith(FEEDBACK_FORM_URL)
    })
  })

  it('shows offline toast when clicked while offline', async () => {
    Object.defineProperty(window, 'navigator', {
      value: { onLine: false },
      writable: true,
    })
    const { toast } = await import('sonner')
    render(<FeedbackButton />)
    const btn = screen.getByTestId('feedback-button') as HTMLButtonElement
    btn.click()
    await vi.waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('offline'))
    })
    expect(mockShellOpen).not.toHaveBeenCalled()
  })

  it('shows error toast when shell.open rejects', async () => {
    Object.defineProperty(window, 'navigator', {
      value: { onLine: true },
      writable: true,
    })
    mockShellOpen.mockRejectedValueOnce(new Error('Failed to open'))
    const { toast } = await import('sonner')
    render(<FeedbackButton />)
    const btn = screen.getByTestId('feedback-button') as HTMLButtonElement
    btn.click()
    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Failed to open'))
    })
  })
})
