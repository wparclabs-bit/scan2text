import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import QueuePanel from './QueuePanel'

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

describe('QueuePanel file type icons', () => {
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

  it('renders image icon for .jpg files with data-testid="queue-icon-image"', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'photo.jpg', fileSize: 500, status: 'completed', createdAt: 1000 },
    })
    render(<QueuePanel />)
    expect(screen.getByTestId('queue-icon-image')).toBeInTheDocument()
  })

  it('renders image icon for .png files with data-testid="queue-icon-image"', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'scan.png', fileSize: 500, status: 'completed', createdAt: 1000 },
    })
    render(<QueuePanel />)
    expect(screen.getByTestId('queue-icon-image')).toBeInTheDocument()
  })

  it('renders pdf icon for .pdf files with data-testid="queue-icon-pdf"', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'doc.pdf', fileSize: 700, status: 'completed', createdAt: 1000 },
    })
    render(<QueuePanel />)
    expect(screen.getByTestId('queue-icon-pdf')).toBeInTheDocument()
  })

  it('renders image icon for .jpeg files with data-testid="queue-icon-image"', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'image.jpeg', fileSize: 500, status: 'completed', createdAt: 1000 },
    })
    render(<QueuePanel />)
    expect(screen.getByTestId('queue-icon-image')).toBeInTheDocument()
  })

  it('renders image icon for .webp files with data-testid="queue-icon-image"', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'anim.webp', fileSize: 500, status: 'completed', createdAt: 1000 },
    })
    render(<QueuePanel />)
    expect(screen.getByTestId('queue-icon-image')).toBeInTheDocument()
  })

  it('does not show both icon types in a single row', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'photo.jpg', fileSize: 500, status: 'completed', createdAt: 1000 },
    })
    render(<QueuePanel />)
    const icons = document.querySelectorAll('[data-testid^="queue-icon-"]')
    expect(icons).toHaveLength(1)
  })
})
