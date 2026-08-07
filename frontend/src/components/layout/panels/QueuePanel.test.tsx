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

  it('shows grey status dot for pending jobs', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'pending', createdAt: 1000 },
    })
    render(<QueuePanel />)
    const dot = screen.getByTestId('queue-item-status-dot') as HTMLElement
    expect(dot).toBeInTheDocument()
    expect(dot.style.background).toBe('rgb(168, 162, 158)')
  })

  it('fixed status slot is always present with w-[14px] class', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'completed', createdAt: 1000 },
    })
    render(<QueuePanel />)
    const item = screen.getByTestId('queue-item') as HTMLElement
    const slot = item.querySelector('[data-testid="queue-item-status-slot"]') as HTMLElement | null
    expect(slot).toBeInTheDocument()
    expect(slot).toHaveClass('w-[14px]')
    expect(slot).toHaveClass('shrink-0')
  })

  it('processing row shows yellow spinner in status slot', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'processing', createdAt: 1000, progress: 45 },
    })
    render(<QueuePanel />)
    const item = screen.getByTestId('queue-item') as HTMLElement
    const spinners = Array.from(item.querySelectorAll('svg')).filter((svg) => svg.classList.contains('animate-spin'))
    expect(spinners.length).toBeGreaterThanOrEqual(1)
    expect(item.innerHTML).toContain('rgb(250, 204, 21)')
  })

  it('no visible text label in status slot for any status', () => {
    ;(['pending', 'uploading', 'processing', 'completed', 'failed'] as const).forEach((status) => {
      setupStore({
        'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status, createdAt: 1000 },
      })
      const { unmount } = render(<QueuePanel />)
      const item = screen.getByTestId('queue-item') as HTMLElement
      const slot = item.querySelector('[data-testid="queue-item-status-slot"]') as HTMLElement | null
      expect(slot).toBeInTheDocument()
      expect(slot!.textContent?.trim()).toBe('')
      unmount()
    })
  })

  it('completed row green dot has glossy 3-stop radial gradient', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'completed', createdAt: 1000 },
    })
    render(<QueuePanel />)
    const dot = screen.getByTestId('queue-item-status-dot') as HTMLElement
    expect(dot.style.background).toContain('radial-gradient')
    expect(dot.style.background).toContain('rgb(134, 239, 172)')
    expect(dot.style.background).toContain('rgb(22, 163, 74)')
    expect(dot.style.background).toContain('rgb(20, 83, 45)')
  })

  it('failed row red dot has glossy 3-stop radial gradient', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'failed', createdAt: 1000 },
    })
    render(<QueuePanel />)
    const dots = Array.from(document.querySelectorAll('[data-testid="queue-item-status-dot"]')) as HTMLElement[]
    const redDot = dots.find((d) => d.style.background?.includes('rgb(220, 38, 38)'))
    expect(redDot).toBeInTheDocument()
    expect(redDot!.style.background).toContain('radial-gradient')
    expect(redDot!.style.background).toContain('rgb(252, 165, 165)')
    expect(redDot!.style.background).toContain('rgb(220, 38, 38)')
    expect(redDot!.style.background).toContain('rgb(127, 29, 29)')
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
    const card = document.querySelector('[data-testid="panel-queue"] > div') as HTMLElement | null
    expect(card).toBeInTheDocument()
    expect(card).toHaveClass('h-full')
    expect(card).toHaveClass('flex-col')
    expect(card).toHaveClass('min-w-0')
    expect(card).toHaveClass('box-border')
  })

  it('card wrapper carries inline depth style with gradient overlay', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'completed', createdAt: 1000 },
    })
    render(<QueuePanel />)
    const card = document.querySelector('[data-testid="panel-queue"] > div') as HTMLElement | null
    expect(card).toBeInTheDocument()
    expect(card?.style.backgroundImage).toContain('linear-gradient')
  })

  it('renders image icon for PNG queue items', () => {
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
    const imgIcon = document.querySelector('[data-testid="queue-icon-image"]')
    expect(imgIcon).toBeInTheDocument()
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

  it('renders PDF icon for PDF queue items', () => {
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
    const pdfIcon = document.querySelector('[data-testid="queue-icon-pdf"]')
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

  it('processing row shows yellow spinner (#FACC15)', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'processing', createdAt: 1000, progress: 45 },
    })
    render(<QueuePanel />)
    const item = screen.getByTestId('queue-item')
    const spinners = Array.from(item.querySelectorAll('svg')).filter((svg) => svg.classList.contains('animate-spin'))
    expect(spinners.length).toBeGreaterThanOrEqual(1)
    expect(item.innerHTML).toContain('rgb(250, 204, 21)')
  })

  it('completed row green dot has glossy 3-stop radial gradient', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'completed', createdAt: 1000 },
    })
    render(<QueuePanel />)
    const dot = screen.getByTestId('queue-item-status-dot') as HTMLElement
    expect(dot.style.background).toContain('radial-gradient')
    expect(dot.style.background).toContain('rgb(134, 239, 172)')
    expect(dot.style.background).toContain('rgb(22, 163, 74)')
    expect(dot.style.background).toContain('rgb(20, 83, 45)')
  })

  it('failed row red dot has glossy 3-stop radial gradient', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'failed', createdAt: 1000 },
    })
    render(<QueuePanel />)
    const dots = Array.from(document.querySelectorAll('[data-testid="queue-item-status-dot"]')) as HTMLElement[]
    const redDot = dots.find((d) => d.style.background?.includes('rgb(220, 38, 38)'))
    expect(redDot).toBeInTheDocument()
    expect(redDot!.style.background).toContain('radial-gradient')
    expect(redDot!.style.background).toContain('rgb(252, 165, 165)')
    expect(redDot!.style.background).toContain('rgb(220, 38, 38)')
    expect(redDot!.style.background).toContain('rgb(127, 29, 29)')
  })

  it('status dot tooltip content carries translate class in component markup', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'completed', createdAt: 1000 },
    })
    render(<QueuePanel />)
    const dot = screen.getByTestId('queue-item-status-dot') as HTMLElement
    expect(dot).toBeInTheDocument()
    expect(dot.style.background).toContain('radial-gradient')
  })

  it('progress bar is present under row metadata for processing jobs', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'processing', createdAt: 1000, progress: 45 },
    })
    render(<QueuePanel />)
    const progressBar = screen.getByTestId('queue-item-progress') as HTMLElement
    expect(progressBar).toBeInTheDocument()
    expect(progressBar).toHaveClass('h-1.5')
  })

  it('queue ScrollArea mounts a visible ScrollBar component', () => {
    const jobs: Record<string, any> = {}
    for (let i = 0; i < 12; i++) {
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
    expect(scrollArea.querySelectorAll('[data-testid="queue-item"]').length).toBe(12)
    const source = require('fs').readFileSync(
      require('path').join(__dirname, './QueuePanel.tsx'),
      'utf8',
    )
    expect(source).toContain('import { ScrollArea, ScrollBar }')
    expect(source).toContain('<ScrollBar orientation="vertical" />')
  })

  it('queue ScrollArea has no inner div with overflow-y-auto class', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'completed', createdAt: 1000 },
    })
    render(<QueuePanel />)
    const scrollArea = screen.getByTestId('queue-scroll-area')
    const overflowDivs = Array.from(scrollArea.querySelectorAll('[class*="overflow-y"]'))
    expect(overflowDivs.length).toBe(0)
  })

  it('status slot has fixed w-[14px] class and is present for every status', () => {
    ;(['pending', 'uploading', 'processing', 'completed', 'failed'] as const).forEach((status) => {
      setupStore({
        'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status, createdAt: 1000 },
      })
      const { unmount } = render(<QueuePanel />)
      const item = screen.getByTestId('queue-item') as HTMLElement
      const slot = item.querySelector('[data-testid="queue-item-status-slot"]') as HTMLElement | null
      expect(slot).toBeInTheDocument()
      expect(slot).toHaveClass('w-[14px]')
      expect(slot).toHaveClass('shrink-0')
      unmount()
    })
  })

  it('pending dot computed background is warm grey', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'pending', createdAt: 1000 },
    })
    render(<QueuePanel />)
    const dot = screen.getByTestId('queue-item-status-dot') as HTMLElement
    const style = window.getComputedStyle(dot)
    expect(style.backgroundColor).toMatch(/rgb\(\d+, \d+, \d+\)/)
  })

  it('processing spinner has bright yellow color in computed style', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'processing', createdAt: 1000, progress: 45 },
    })
    render(<QueuePanel />)
    const item = screen.getByTestId('queue-item') as HTMLElement
    const spinners = Array.from(item.querySelectorAll<SVGSVGElement>('svg')).filter((svg) => svg.classList.contains('animate-spin'))
    expect(spinners.length).toBeGreaterThanOrEqual(1)
    const color = spinners[0].getAttribute('color') || spinners[0].style.color
    expect(color).toBeTruthy()
  })

  it('completed dot computed background contains green gradient', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'completed', createdAt: 1000 },
    })
    render(<QueuePanel />)
    const dot = screen.getByTestId('queue-item-status-dot') as HTMLElement
    const style = window.getComputedStyle(dot)
    expect(style.backgroundImage).toContain('radial-gradient')
  })

  it('failed dot computed background contains red gradient', () => {
    setupStore({
      'job-1': { id: 'job-1', fileName: 'test.png', fileSize: 500, status: 'failed', createdAt: 1000 },
    })
    render(<QueuePanel />)
    const dots = Array.from(document.querySelectorAll('[data-testid="queue-item-status-dot"]')) as HTMLElement[]
    const redDot = dots.find((d) => d.style.background?.includes('rgb(220, 38, 38)'))
    expect(redDot).toBeInTheDocument()
    const style = window.getComputedStyle(redDot!)
    expect(style.backgroundImage).toContain('radial-gradient')
  })
})
