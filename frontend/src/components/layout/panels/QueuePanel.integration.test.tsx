import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import QueuePanel from './QueuePanel'

vi.mock('@/lib/cleanupObjectURLs', () => ({
  cleanupObjectURLs: vi.fn(),
}))

const realStore = await vi.importActual<typeof import('@/stores/scan2text.store')>('@/stores/scan2text.store')
const { useScan2TextStore } = realStore

function createTestJobs() {
  return {
    'job-queued': { id: 'job-queued', fileName: 'queued.png', fileSize: 500, fileType: 'image/png', status: 'pending' as const, createdAt: 1000, taskId: null, isBackground: false, resultMarkdown: null, markdownOutput: '', error: null, file: null, progress: 0 },
    'job-processing': { id: 'job-processing', fileName: 'processing.png', fileSize: 600, fileType: 'image/png', status: 'processing' as const, createdAt: 2000, taskId: 'task-1', isBackground: false, resultMarkdown: null, markdownOutput: '', error: null, file: null, progress: 45 },
    'job-completed': { id: 'job-completed', fileName: 'done.pdf', fileSize: 700, fileType: 'application/pdf', status: 'completed' as const, createdAt: 3000, taskId: 'task-2', isBackground: true, resultMarkdown: '# Done', markdownOutput: '# Done', error: null, file: null, progress: 100 },
    'job-failed': { id: 'job-failed', fileName: 'failed.png', fileSize: 800, fileType: 'image/png', status: 'failed' as const, createdAt: 4000, taskId: 'task-3', isBackground: false, resultMarkdown: null, markdownOutput: '', error: 'OCR error', file: null, progress: 0 },
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
