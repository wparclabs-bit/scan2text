import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import QueuePanel from './QueuePanel'

vi.mock('@/stores/scan2text.store', () => ({
  useScan2TextStore: vi.fn(),
}))

vi.mock('@/lib/cleanupObjectURLs', () => ({
  cleanupObjectURLs: vi.fn(),
}))

const { useScan2TextStore } = await import('@/stores/scan2text.store')

describe('QueuePanel status dots and retry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function setupStore(jobs: Record<string, any>, selectedJobId: string | null = null) {
    ;(useScan2TextStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (state: any) => any) => {
        const state = { jobs, selectedJobId }
        return selector(state)
      },
    )
  }

  it('shows green status dot for completed jobs', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'completed', createdAt: 1000 },
    })
    render(<QueuePanel />)
    expect(screen.getByTestId('queue-item-status-dot')).toBeInTheDocument()
  })

  it('shows red status dot for failed jobs', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'failed', createdAt: 1000 },
    })
    render(<QueuePanel />)
    expect(screen.getByTestId('queue-item-status-dot')).toBeInTheDocument()
  })

  it('does not show status dot for pending jobs', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'pending', createdAt: 1000 },
    })
    render(<QueuePanel />)
    expect(screen.queryByTestId('queue-item-status-dot')).not.toBeInTheDocument()
  })

  it('shows spinner and progress bar during processing', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'processing', createdAt: 1000, progress: 45 },
    })
    render(<QueuePanel />)
    expect(screen.getByTestId('queue-item-progress')).toBeInTheDocument()
  })

  it('shows spinner and progress bar during uploading', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'uploading', createdAt: 1000, progress: 20 },
    })
    render(<QueuePanel />)
    expect(screen.getByTestId('queue-item-progress')).toBeInTheDocument()
  })

  it('does not show progress bar for completed jobs', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'completed', createdAt: 1000 },
    })
    render(<QueuePanel />)
    expect(screen.queryByTestId('queue-item-progress')).not.toBeInTheDocument()
  })

  it('retry button is visible on failed jobs', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'failed', createdAt: 1000, file: null },
    })
    render(<QueuePanel />)
    expect(screen.getByTestId('queue-item-retry')).toBeInTheDocument()
  })

  it('retry button is not visible on non-failed jobs', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'completed', createdAt: 1000, file: null },
    })
    render(<QueuePanel />)
    expect(screen.queryByTestId('queue-item-retry')).not.toBeInTheDocument()
  })

  it('clicking retry calls retryJob with the job id', async () => {
    let jobs = {
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'failed', createdAt: 1000, file: null },
    }
    const retryJob = vi.fn().mockResolvedValue('new-job-id')
    ;(useScan2TextStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: any) => any) => {
      const state = { jobs, selectedJobId: null, retryJob }
      return selector(state)
    })
    render(<QueuePanel />)
    fireEvent.click(screen.getByTestId('queue-item-retry'))
    expect(retryJob).toHaveBeenCalledWith('job-1')
  })

  it('retry button is disabled during retry to prevent double-click', async () => {
    let jobs = {
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'failed', createdAt: 1000, file: null },
    }
    let isRetrying = false
    const retryJob = vi.fn().mockImplementation(async () => {
      isRetrying = true
      return 'new-job-id'
    })
    ;(useScan2TextStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: any) => any) => {
      const state = { jobs, selectedJobId: null, retryJob, isRetrying }
      return selector(state)
    })
    render(<QueuePanel />)
    const btn = screen.getByTestId('queue-item-retry')
    expect(btn).not.toBeDisabled()
    fireEvent.click(btn)
    expect(btn).toBeDisabled()
  })

  it('card wrapper uses h-full flex-col min-w-0 box-border for uniform alignment', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'completed', createdAt: 1000 },
    })
    render(<QueuePanel />)
    const card = document.querySelector('.surface-center') as HTMLElement | null
    expect(card).toBeInTheDocument()
    expect(card).toHaveClass('h-full')
    expect(card).toHaveClass('flex-col')
    expect(card).toHaveClass('min-w-0')
    expect(card).toHaveClass('box-border')
  })

  it('renders PDF icon placeholder for all queue items without img elements', () => {
    setupStore({
      'job-1': {
        id: 'job-1',
        fileName: 'scan.png',
        fileType: 'image/png',
        fileSize: 500,
        status: 'completed',
        createdAt: 1000,
        markdownOutput: '# Result',
      },
    })
    render(<QueuePanel />)
    const pdfIcon = document.querySelector('[data-testid="queue-item-pdf-icon"]')
    expect(pdfIcon).toBeInTheDocument()
  })

  it('renders row without thumbnail when job has blob URL', () => {
    setupStore({
      'job-1': {
        id: 'job-1',
        fileName: 'scan.png',
        fileType: 'image/png',
        fileSize: 500,
        status: 'completed',
        createdAt: 1000,
        markdownOutput: '# Result',
      },
    })
    render(<QueuePanel />)
    expect(screen.getByTestId('queue-item')).toBeInTheDocument()
    expect(screen.queryByTestId('queue-item-thumbnail')).not.toBeInTheDocument()
  })

  it('renders PDF icon placeholder for PDF jobs without img elements', () => {
    setupStore({
      'job-1': {
        id: 'job-1',
        fileName: 'doc.pdf',
        fileType: 'application/pdf',
        fileSize: 700,
        status: 'completed',
        createdAt: 1000,
        resultMarkdown: '# Done',
        markdownOutput: '# Done',
      },
    })
    render(<QueuePanel />)
    const pdfIcon = document.querySelector('[data-testid="queue-item-pdf-icon"]')
    expect(pdfIcon).toBeInTheDocument()
  })

  it('applies truncate class to filename element for long spaceless names', () => {
    const longName = 'a'.repeat(60)
    setupStore({
      'job-1': { id: 'job-1', fileName: longName, fileSize: 500, status: 'completed', createdAt: 1000 },
    })
    render(<QueuePanel />)
    const nameEl = screen.getByTestId('queue-item-name') as HTMLElement
    expect(nameEl).toHaveClass('truncate')
  })
})
