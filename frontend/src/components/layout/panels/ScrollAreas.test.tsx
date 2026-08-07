import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import QueuePanel from './QueuePanel'
import PreviewPanel from './PreviewPanel'
import DropZonePanel from './DropZonePanel'

vi.mock('@/stores/scan2text.store', () => ({
  useScan2TextStore: vi.fn(),
}))

vi.mock('@/stores/preferencesStore', () => ({
  usePreferenceStore: vi.fn(() => 'dark'),
}))

vi.mock('@/lib/cleanupObjectURLs', () => ({
  cleanupObjectURLs: vi.fn(),
}))

const { useScan2TextStore } = await import('@/stores/scan2text.store')

describe('ScrollAreas', () => {
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

  describe('QueuePanel scroll area', () => {
    it('renders queue-scroll-area with data-testid when jobs exist', () => {
      setupStore({
        'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'completed', createdAt: 1000 },
      })
      render(<QueuePanel />)
      expect(screen.getByTestId('queue-scroll-area')).toBeInTheDocument()
    })

    it('keeps card height fixed with 20 fake jobs and scroll area contains all items', () => {
      const jobs: Record<string, any> = {}
      for (let i = 0; i < 20; i++) {
        jobs[`job-${i}`] = {
          id: `job-${i}`,
          fileName: `file-${i}.png`,
          fileSize: 500 + i * 10,
          status: 'completed' as const,
          createdAt: 1000 + i,
        }
      }
      setupStore(jobs)
      render(<QueuePanel />)
      const scrollArea = screen.getByTestId('queue-scroll-area')
      expect(scrollArea).toBeInTheDocument()
      const items = scrollArea.querySelectorAll('[data-testid="queue-item"]')
      expect(items).toHaveLength(20)
      const card = document.querySelector('[data-testid="panel-queue"] > div') as HTMLElement | null
      expect(card).toHaveClass('h-full')
      expect(card).toHaveClass('overflow-hidden')
    })

    it('renders job items inside the scroll area', () => {
      setupStore({
        'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'completed', createdAt: 1000 },
        'job-2': { id: 'job-2', fileName: 'test2.jpg', fileSize: 600, status: 'pending', createdAt: 2000 },
      })
      render(<QueuePanel />)
      const items = screen.getAllByTestId('queue-item')
      expect(items).toHaveLength(2)
      const scrollArea = screen.getByTestId('queue-scroll-area')
      expect(scrollArea.querySelectorAll('[data-testid="queue-item"]').length).toBe(2)
    })
  })

  describe('PreviewPanel scroll area', () => {
    it('renders preview-scroll-area with data-testid for completed jobs', () => {
      ;(vi.mocked(useScan2TextStore) as any).mockImplementation(
        (selector: (state: any) => any) => {
          const state = {
            selectedJobId: 'job-1',
            jobs: {
              'job-1': {
                id: 'job-1',
                fileName: 'test.png',
                fileType: 'image/png',
                status: 'completed',
                resultMarkdown: '# Hello\n\nSome text.',
              },
            },
          }
          return selector(state)
        },
      )
      render(<PreviewPanel />)
      expect(screen.getByTestId('preview-scroll-area')).toBeInTheDocument()
    })

    it('does not render preview-scroll-area when no job is selected', () => {
      ;(vi.mocked(useScan2TextStore) as any).mockImplementation(
        (selector: (state: any) => any) => {
          const state = { selectedJobId: null, jobs: {} }
          return selector(state)
        },
      )
      render(<PreviewPanel />)
      expect(screen.queryByTestId('preview-scroll-area')).not.toBeInTheDocument()
    })
  })

  describe('DropZonePanel', () => {
    it('renders dropzone-header with data-testid', () => {
      render(<DropZonePanel />)
      expect(screen.getByTestId('dropzone-header')).toBeInTheDocument()
    })

    it('renders dropzone-hint with data-testid', () => {
      render(<DropZonePanel />)
      expect(screen.getByTestId('dropzone-hint')).toBeInTheDocument()
    })
  })
})
