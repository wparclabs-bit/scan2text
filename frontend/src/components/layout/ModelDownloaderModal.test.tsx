import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ModelDownloaderModal from './ModelDownloaderModal'
import { buildApiUrl } from '@/lib/apiBase'
import { initI18n } from '@/i18n'
import en from '@/locales/en.json'

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
      expect(screen.getByTestId('download-button')).toBeInTheDocument()
    })
    const restartButton = screen.getByTestId('download-button')
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
      expect(screen.getByTestId('download-button')).toBeInTheDocument()
    })
    const restartButton = screen.getByTestId('download-button')
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
      expect(screen.getByTestId('download-button')).toBeInTheDocument()
    })
    expect(screen.getByText('Network connection failed. Please check your connection and try again.')).toBeInTheDocument()
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
      expect(screen.getByTestId('download-button')).toBeInTheDocument()
    })
    const retryButton = screen.getByTestId('download-button')
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

  it('renders translated versionJsonMissing error instead of raw string', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'failed', bytes_downloaded: 0, total_bytes: 0, error_message: 'version.json not found' }),
    })
    render(<ModelDownloaderModal open={true} onClose={() => {}} />)
    await waitFor(() => {
      expect(screen.getByTestId('download-button')).toBeInTheDocument()
    })
    const errorText = screen.getByText(/Model manifest not found/).textContent
    expect(errorText).toBe('Model manifest not found. Restart download to fetch it.')
    expect(screen.queryByText(/Error: version\.json not found/)).not.toBeInTheDocument()
  })

  it('shows single progressUnknown line when total_bytes is 0, not doubled', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'idle', bytes_downloaded: 0, total_bytes: 0 }),
    })
    render(<ModelDownloaderModal open={true} onClose={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText('Downloading AI Engine')).toBeInTheDocument()
    })
    const modal = screen.getByTestId('model-downloader-modal')
    const textContent = modal.textContent!
    const matches = textContent.match(/Waiting for download info…/g)
    expect(matches).toHaveLength(1)
    expect(textContent).not.toMatch(/Waiting.*of.*Waiting/)
  })

  it('enter visible retrying state on restart click while request in flight', async () => {
    let startResolve: (() => void) | null = null
    const startPromise = new Promise<void>(resolve => { startResolve = resolve })
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'failed', bytes_downloaded: 0, total_bytes: 0, error_message: 'Hash mismatch' }),
      })
      .mockImplementation(async (url: string | URL | RequestInfo) => {
        if (url.toString().includes('/api/download/start')) {
          return { ok: true, json: () => startPromise } as Response
        }
        return { ok: true, json: () => Promise.resolve({ status: 'failed', bytes_downloaded: 0, total_bytes: 0, error_message: 'Hash mismatch' }) } as Response
      })
    render(<ModelDownloaderModal open={true} onClose={() => {}} />)
    await waitFor(() => {
      expect(screen.getByTestId('download-button')).toBeInTheDocument()
    })
    const restartButton = screen.getByTestId('download-button')
    fireEvent.click(restartButton)
    await waitFor(() => {
      expect(restartButton).toBeDisabled()
    })
    startResolve!()
    await startPromise
    await waitFor(() => {
      expect(restartButton).not.toBeDisabled()
    })
  })

  describe('4-scenario matrix', () => {
    beforeEach(() => {
      initI18n({ en: { translation: en } })
    })

    it('Scenario 1: modelsMissing=true, isOnline=true, versionJsonExists=true renders standard download UI with download button', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'idle', bytes_downloaded: 0, total_bytes: 0 }),
      })
      render(<ModelDownloaderModal open={true} onClose={() => {}} modelsMissing={true} isOnline={true} versionJsonExists={true} />)
      await waitFor(() => {
        expect(screen.getByText('Downloading AI Engine')).toBeInTheDocument()
      })
      const downloadBtn = screen.getByTestId('download-button')
      expect(downloadBtn).toBeInTheDocument()
      expect(downloadBtn).toHaveTextContent('Download Models')
    })

    it('Scenario 2: modelsMissing=true, isOnline=false, versionJsonExists=true renders offlineWarning', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'idle', bytes_downloaded: 0, total_bytes: 0 }),
      })
      render(<ModelDownloaderModal open={true} onClose={() => {}} modelsMissing={true} isOnline={false} versionJsonExists={true} />)
      await waitFor(() => {
        expect(screen.getByText('You are offline. Connect to the internet to download required models.')).toBeInTheDocument()
      })
      expect(screen.queryByTestId('download-button')).not.toBeInTheDocument()
    })

    it('Scenario 3: modelsMissing=true, versionJsonExists=false renders versionJsonMissing regardless of online status', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'idle', bytes_downloaded: 0, total_bytes: 0 }),
      })
      render(<ModelDownloaderModal open={true} onClose={() => {}} modelsMissing={true} isOnline={true} versionJsonExists={false} />)
      await waitFor(() => {
        expect(screen.getByText('Configuration file missing. Please reinstall or contact support.')).toBeInTheDocument()
      })
      expect(screen.queryByTestId('download-button')).not.toBeInTheDocument()
    })

    it('Scenario 4: modelsMissing=false returns null and does not render', async () => {
      const { container } = render(<ModelDownloaderModal open={true} onClose={() => {}} modelsMissing={false} isOnline={true} versionJsonExists={true} />)
      await waitFor(() => {
        expect(container.firstChild).toBeNull()
      })
      expect(screen.queryByTestId('model-downloader-modal')).not.toBeInTheDocument()
    })
  })
})
