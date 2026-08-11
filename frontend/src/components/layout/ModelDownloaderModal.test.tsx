import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ModelDownloaderModal from './ModelDownloaderModal'

describe('ModelDownloaderModal', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  it('renders full-screen overlay when open', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'downloading', bytes_downloaded: 500, total_bytes: 1000 }),
    })
    render(<ModelDownloaderModal open={true} onClose={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText('Downloading AI Engine')).toBeInTheDocument()
    })
    const overlay = document.querySelector('[data-testid="model-downloader-modal"]')
    expect(overlay).toBeInTheDocument()
    expect(overlay).toHaveClass('fixed')
  })

  it('shows progress bar and bytes downloaded', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'downloading', bytes_downloaded: 500, total_bytes: 1000 }),
    })
    render(<ModelDownloaderModal open={true} onClose={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText(/500 B of 1000 B/)).toBeInTheDocument()
    })
  })

  it('clicking Cancel calls POST /api/download/cancel', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'downloading', bytes_downloaded: 500, total_bytes: 1000 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'cancelled', bytes_downloaded: 500, total_bytes: 1000 }),
      })
    render(<ModelDownloaderModal open={true} onClose={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText('Downloading AI Engine')).toBeInTheDocument()
    })
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/download/cancel',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('shows Restart Download button if status is cancelled', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'cancelled', bytes_downloaded: 0, total_bytes: 0 }),
    })
    render(<ModelDownloaderModal open={true} onClose={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText('Restart Download')).toBeInTheDocument()
    })
  })

  it('shows Restart Download button if status is failed', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'failed', bytes_downloaded: 0, total_bytes: 0, error_message: 'Hash mismatch' }),
    })
    render(<ModelDownloaderModal open={true} onClose={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText('Restart Download')).toBeInTheDocument()
    })
  })

  it('closes modal when status becomes complete', async () => {
    const handleClose = vi.fn()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'complete', bytes_downloaded: 1000, total_bytes: 1000 }),
    })
    render(<ModelDownloaderModal open={true} onClose={handleClose} />)
    await waitFor(() => {
      expect(handleClose).toHaveBeenCalled()
    }, { timeout: 3000 })
  })
})
