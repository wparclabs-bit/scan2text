import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import QueuePanel from './QueuePanel'
import PreviewPanel from './PreviewPanel'

vi.mock('@/lib/cleanupObjectURLs', () => ({
  cleanupObjectURLs: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const realStore = await vi.importActual<typeof import('@/stores/scan2text.store')>('@/stores/scan2text.store')
const { useScan2TextStore } = realStore

function createTestJobs() {
  return {
    'job-queued': { id: 'job-queued', fileName: 'queued.png', fileSize: 500, fileType: 'image/png', status: 'pending' as const, createdAt: 1000, taskId: null, isBackground: false, resultMarkdown: null, markdownOutput: '', error: null, errorCode: null, file: null, progress: 0 },
    'job-processing': { id: 'job-processing', fileName: 'processing.png', fileSize: 600, fileType: 'image/png', status: 'processing' as const, createdAt: 2000, taskId: 'task-1', isBackground: false, resultMarkdown: null, markdownOutput: '', error: null, errorCode: null, file: null, progress: 45 },
    'job-completed': { id: 'job-completed', fileName: 'done.pdf', fileSize: 700, fileType: 'application/pdf', status: 'completed' as const, createdAt: 3000, taskId: 'task-2', isBackground: true, resultMarkdown: '# Done', markdownOutput: '# Done', error: null, errorCode: null, file: null, progress: 100 },
    'job-failed': { id: 'job-failed', fileName: 'failed.png', fileSize: 800, fileType: 'image/png', status: 'failed' as const, createdAt: 4000, taskId: 'task-3', isBackground: false, resultMarkdown: null, markdownOutput: '', error: 'OCR error', errorCode: null, file: null, progress: 0 },
  }
}

describe('QueuePanel real store integration — no infinite loop', () => {
  beforeEach(() => {
    useScan2TextStore.setState({ jobs: {}, selectedJobId: null, activeJobId: null })
  })

  it('renders queue items with all major statuses without throwing', () => {
    const testJobs = createTestJobs()
    useScan2TextStore.setState({ jobs: testJobs, selectedJobId: null, activeJobId: null })

    expect(() => {
      render(<QueuePanel />)
    }).not.toThrow()

    const items = screen.getAllByTestId('queue-item')
    expect(items).toHaveLength(4)
  })

  it('re-renders stably after a store update does not throw', () => {
    const testJobs = createTestJobs()
    useScan2TextStore.setState({ jobs: testJobs, selectedJobId: null, activeJobId: null })

    const { rerender } = render(<QueuePanel />)
    expect(screen.getAllByTestId('queue-item').length).toBe(4)

    useScan2TextStore.setState({ selectedJobId: 'job-completed' })
    expect(() => {
      rerender(<QueuePanel />)
    }).not.toThrow()
  })

})

describe('Queue row click selects job in preview (FR-02/FR-04)', () => {
  beforeEach(() => {
    useScan2TextStore.setState({ jobs: {}, selectedJobId: null, activeJobId: null })
  })

  it('clicking a queue row selects that job and preview shows its markdown', () => {
    const jobs = {
      'job-a': {
        id: 'job-a',
        fileName: 'first.png',
        fileSize: 500,
        fileType: 'image/png',
        status: 'completed' as const,
        createdAt: 1000,
        taskId: 'task-a',
        isBackground: false,
        resultMarkdown: '# First Document\n\nPage one content.',
        markdownOutput: '# First Document\n\nPage one content.',
        error: null,
        errorCode: null,
        file: null,
        progress: 100,
      },
      'job-b': {
        id: 'job-b',
        fileName: 'second.pdf',
        fileSize: 600,
        fileType: 'application/pdf',
        status: 'completed' as const,
        createdAt: 2000,
        taskId: 'task-b',
        isBackground: true,
        resultMarkdown: '# Second Document\n\nPage two content.',
        markdownOutput: '# Second Document\n\nPage two content.',
        error: null,
        errorCode: null,
        file: null,
        progress: 100,
      },
    }
    useScan2TextStore.setState({ jobs, selectedJobId: null, activeJobId: null })

    render(
      <>
        <QueuePanel />
        <PreviewPanel />
      </>,
    )

    const rows = screen.getAllByTestId('queue-item')
    expect(rows).toHaveLength(2)

    // Initially no preview content from either job
    expect(screen.queryByText('# First Document')).not.toBeInTheDocument()
    expect(screen.queryByText('# Second Document')).not.toBeInTheDocument()

    // Click first row
    fireEvent.click(rows[0])
    expect(useScan2TextStore.getState().selectedJobId).toBe('job-a')
    expect(screen.getByText('First Document')).toBeInTheDocument()
    expect(screen.queryByText('Second Document')).not.toBeInTheDocument()

    // Click second row
    fireEvent.click(rows[1])
    expect(useScan2TextStore.getState().selectedJobId).toBe('job-b')
    expect(screen.getByText('Second Document')).toBeInTheDocument()
    expect(screen.queryByText('First Document')).not.toBeInTheDocument()
  })

  it('retry button click does NOT trigger row selection (stopPropagation)', async () => {
    const jobs = {
      'job-fail': {
        id: 'job-fail',
        fileName: 'failed.png',
        fileSize: 500,
        fileType: 'image/png',
        status: 'failed' as const,
        createdAt: 1000,
        taskId: 'task-x',
        isBackground: false,
        resultMarkdown: null,
        markdownOutput: '',
        error: 'OCR error',
        errorCode: null,
        file: { name: 'failed.png' } as File,
        progress: 0,
      },
    }
    const retryJob = vi.fn().mockResolvedValue('new-job-id')
    useScan2TextStore.setState({ jobs, selectedJobId: null, activeJobId: null, retryJob })

    render(
      <>
        <QueuePanel />
        <PreviewPanel />
      </>,
    )

    const _row = screen.getByTestId('queue-item')
    void _row
    const retryBtn = screen.getByTestId('queue-item-retry')

    fireEvent.click(retryBtn)
    // Row selection must NOT have been triggered
    expect(useScan2TextStore.getState().selectedJobId).toBeNull()
    expect(retryJob).toHaveBeenCalledWith('job-fail')
  })
})
