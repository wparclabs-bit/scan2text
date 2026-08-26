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
    render(<FeedbackButton onOfflineOpen={() => {}} />)
    expect(screen.getByTestId('feedback-button')).toBeInTheDocument()
  })

  it('calls shell.open with Google Form URL when online', () => {
    Object.defineProperty(window, 'navigator', {
      value: { onLine: true },
      writable: true,
    })
    render(<FeedbackButton onOfflineOpen={() => {}} />)
    const btn = screen.getByTestId('feedback-button') as HTMLButtonElement
    btn.click()
    expect(mockShellOpen).toHaveBeenCalledWith(FEEDBACK_FORM_URL)
  })

  it('calls onOfflineOpen when offline and does not call shell.open', () => {
    Object.defineProperty(window, 'navigator', {
      value: { onLine: false },
      writable: true,
    })
    const mockOfflineOpen = vi.fn()
    render(<FeedbackButton onOfflineOpen={mockOfflineOpen} />)
    const btn = screen.getByTestId('feedback-button') as HTMLButtonElement
    btn.click()
    expect(mockOfflineOpen).toHaveBeenCalled()
    expect(mockShellOpen).not.toHaveBeenCalled()
  })
})
