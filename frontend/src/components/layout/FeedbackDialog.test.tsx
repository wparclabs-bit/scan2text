import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FeedbackDialog from './FeedbackDialog'

const mockFetch = vi.fn()
const mockClose = vi.fn()

vi.stubGlobal('fetch', mockFetch)

describe('FeedbackDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('renders textarea and contact input', () => {
    render(<FeedbackDialog open={true} onClose={mockClose} />)
    expect(screen.getByTestId('feedback-textarea')).toBeInTheDocument()
    expect(screen.getByTestId('feedback-contact')).toBeInTheDocument()
  })

  it('submit button is present', () => {
    render(<FeedbackDialog open={true} onClose={mockClose} />)
    expect(screen.getByTestId('feedback-submit')).toBeInTheDocument()
  })

  it('calls POST /api/feedback with correct payload on submit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ filename: 'test.json' }),
    })
    render(<FeedbackDialog open={true} onClose={mockClose} />)
    const textarea = screen.getByTestId('feedback-textarea') as HTMLTextAreaElement
    const contactInput = screen.getByTestId('feedback-contact') as HTMLInputElement
    fireEvent.change(textarea, { target: { value: 'Great app!' } })
    fireEvent.change(contactInput, { target: { value: 'user@example.com' } })
    const submitBtn = screen.getByTestId('feedback-submit') as HTMLButtonElement
    fireEvent.click(submitBtn)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/feedback',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ message: 'Great app!', contact: 'user@example.com' }),
        })
      )
    })
  })

  it('calls POST /api/feedback without contact when empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ filename: 'test.json' }),
    })
    render(<FeedbackDialog open={true} onClose={mockClose} />)
    const textarea = screen.getByTestId('feedback-textarea') as HTMLTextAreaElement
    const contactInput = screen.getByTestId('feedback-contact') as HTMLInputElement
    fireEvent.change(textarea, { target: { value: 'No contact' } })
    fireEvent.change(contactInput, { target: { value: '' } })
    const submitBtn = screen.getByTestId('feedback-submit') as HTMLButtonElement
    fireEvent.click(submitBtn)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/feedback',
        expect.objectContaining({
          body: JSON.stringify({ message: 'No contact', contact: null }),
        })
      )
    })
  })

  it('closes on API success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ filename: 'test.json' }),
    })
    render(<FeedbackDialog open={true} onClose={mockClose} />)
    const textarea = screen.getByTestId('feedback-textarea') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'Success test' } })
    const submitBtn = screen.getByTestId('feedback-submit') as HTMLButtonElement
    fireEvent.click(submitBtn)
    await waitFor(() => {
      expect(mockClose).toHaveBeenCalled()
    })
  })

  it('does not render when open is false', () => {
    const { container } = render(<FeedbackDialog open={false} onClose={mockClose} />)
    expect(container.querySelector('[data-testid="feedback-dialog"]')).not.toBeInTheDocument()
  })
})
