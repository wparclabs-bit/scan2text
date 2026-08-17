import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ModelDownloaderModal from './ModelDownloaderModal'
import { buildApiUrl } from '@/lib/apiBase'

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
        buildApiUrl('/api/download/cancel'),
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

  it('clicking Restart Download in failed state calls POST /api/download/start', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'failed', bytes_downloaded: 0, total_bytes: 0, error_message: 'Hash mismatch' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'downloading', bytes_downloaded: 0, total_bytes: 1024 }),
      })
    render(<ModelDownloaderModal open={true} onClose={() => {}} />)
    await waitFor(() => {
      expect(screen.getByTestId('download-restart-btn')).toBeInTheDocument()
    })
    const restartButton = screen.getByTestId('download-restart-btn')
    fireEvent.click(restartButton)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        buildApiUrl('/api/download/start'),
        expect.objectContaining({ method: 'POST' })
      )
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

  it('uses buildApiUrl for download/progress in prod mode', async () => {
    vi.stubEnv('PROD', true)
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'complete', bytes_downloaded: 1000, total_bytes: 1000 }),
    })
    render(<ModelDownloaderModal open={true} onClose={() => {}} />)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('127.0.0.1:47351'))
    })
    vi.unstubAllEnvs()
  })

  it('uses buildApiUrl for download/cancel in prod mode', async () => {
    vi.stubEnv('PROD', true)
    mockFetch.mockReset()
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
        buildApiUrl('/api/download/cancel'),
        expect.objectContaining({ method: 'POST' })
      )
    })
    vi.unstubAllEnvs()
  })

  it('uses buildApiUrl for download/start in prod mode', async () => {
    vi.stubEnv('PROD', true)
    mockFetch.mockReset()
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'failed', bytes_downloaded: 0, total_bytes: 0, error_message: 'Hash mismatch' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'downloading', bytes_downloaded: 0, total_bytes: 1024 }),
      })
    render(<ModelDownloaderModal open={true} onClose={() => {}} />)
    await waitFor(() => {
      expect(screen.getByTestId('download-restart-btn')).toBeInTheDocument()
    })
    const restartButton = screen.getByTestId('download-restart-btn')
    fireEvent.click(restartButton)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        buildApiUrl('/api/download/start'),
        expect.objectContaining({ method: 'POST' })
      )
    })
    vi.unstubAllEnvs()
  })

  it('shows translated network error and retry button when fetch rejects', async () => {
    mockFetch.mockRejectedValue(new Error('Network Error'))
    render(<ModelDownloaderModal open={true} onClose={() => {}} />)
    await waitFor(() => {
      expect(screen.getByTestId('download-restart-btn')).toBeInTheDocument()
    })
    expect(screen.getByText(/downloader\.error\.network/)).toBeInTheDocument()
  })

  it('re-triggers fetch when retry button is clicked after network error', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'failed', bytes_downloaded: 0, total_bytes: 0, error_message: 'version.json not found' }),
      })
    render(<ModelDownloaderModal open={true} onClose={() => {}} />)
    await waitFor(() => {
      expect(screen.getByTestId('download-restart-btn')).toBeInTheDocument()
    })
    const retryButton = screen.getByTestId('download-restart-btn')
    fireEvent.click(retryButton)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  it('does not render literal "0 B of 0 B" when total_bytes is unknown', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'idle', bytes_downloaded: 0, total_bytes: 0 }),
    })
    render(<ModelDownloaderModal open={true} onClose={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText('Downloading AI Engine')).toBeInTheDocument()
    })
    expect(screen.queryByText(/0 B of 0 B/)).not.toBeInTheDocument()
  })
})
