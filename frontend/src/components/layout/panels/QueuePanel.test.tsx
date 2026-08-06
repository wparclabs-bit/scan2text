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

describe('QueuePanel remove and retry', () => {
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

  it('remove button is visible on queue item', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'pending', createdAt: 1000 },
    })
    render(<QueuePanel />)
    expect(screen.getByTestId('queue-item-remove')).toBeInTheDocument()
  })

  it('clicking remove deletes job from store', async () => {
    let jobs = {
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'pending', createdAt: 1000 },
    }
    const removeJob = vi.fn()
    ;(useScan2TextStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: any) => any) => {
      const state = { jobs, selectedJobId: null, removeJob }
      return selector(state)
    })
    render(<QueuePanel />)
    fireEvent.click(screen.getByTestId('queue-item-remove'))
    expect(removeJob).toHaveBeenCalledWith('job-1')
  })

  it('removing selected job clears selectedJobId', async () => {
    let jobs = {
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'completed', createdAt: 1000, markdownOutput: '# Done' },
    }
    let selectedJobId = 'job-1'
    const removeJob = vi.fn()
    const setSelectedJobId = vi.fn()
    ;(useScan2TextStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: any) => any) => {
      const state = { jobs, selectedJobId, removeJob, setSelectedJobId }
      return selector(state)
    })
    render(<QueuePanel />)
    fireEvent.click(screen.getByTestId('queue-item-remove'))
    expect(setSelectedJobId).toHaveBeenCalledWith(null)
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
})
