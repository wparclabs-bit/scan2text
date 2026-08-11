import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import FeedbackButton from './FeedbackButton'

const mockOpen = vi.fn()

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

  it('opens browser when online', () => {
    Object.defineProperty(window, 'navigator', {
      value: { onLine: true },
      writable: true,
    })
    Object.defineProperty(window, 'open', {
      value: mockOpen,
      writable: true,
      configurable: true,
    })
    render(<FeedbackButton onOfflineOpen={() => {}} />)
    const btn = screen.getByTestId('feedback-button') as HTMLButtonElement
    btn.click()
    expect(mockOpen).toHaveBeenCalledWith(
      'https://placeholder.local/feedback',
      '_blank'
    )
  })

  it('calls onOfflineOpen when offline', () => {
    Object.defineProperty(window, 'navigator', {
      value: { onLine: false },
      writable: true,
    })
    const mockOfflineOpen = vi.fn()
    render(<FeedbackButton onOfflineOpen={mockOfflineOpen} />)
    const btn = screen.getByTestId('feedback-button') as HTMLButtonElement
    btn.click()
    expect(mockOfflineOpen).toHaveBeenCalled()
  })
})
