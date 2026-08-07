import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BottomStatusBar from './BottomStatusBar'

let mockJobs: Record<string, any> = {}

vi.mock('@/stores/scan2text.store', () => {
  const store = {
    getState: () => ({ jobs: mockJobs }),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const useStore = (selector: any) => selector(store.getState())
  useStore.getState = store.getState.bind(store)
  return { useScan2TextStore: useStore }
})

describe('BottomStatusBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockJobs = {}
  })

  it('renders with data-testid="bottom-bar"', () => {
    render(<BottomStatusBar />)
    expect(screen.getByTestId('bottom-bar')).toBeInTheDocument()
  })

  it('displays Worker Idle when no active jobs', () => {
    render(<BottomStatusBar />)
    expect(screen.getByText('Worker: Idle')).toBeInTheDocument()
  })

  it('displays Worker Busy when a job is processing', () => {
    mockJobs = { 'job-1': { id: 'job-1', status: 'processing' } }
    render(<BottomStatusBar />)
    expect(screen.getByText('Worker: Busy')).toBeInTheDocument()
  })

  it('displays Worker Busy when a job is uploading', () => {
    mockJobs = { 'job-1': { id: 'job-1', status: 'uploading' } }
    render(<BottomStatusBar />)
    expect(screen.getByText('Worker: Busy')).toBeInTheDocument()
  })

  it('displays RAM as em dash', () => {
    render(<BottomStatusBar />)
    expect(screen.getByText('RAM: —')).toBeInTheDocument()
  })

  it('displays app version', () => {
    render(<BottomStatusBar />)
    expect(screen.getByText('v0.1.0-demo')).toBeInTheDocument()
  })

  it('renders share button with data-testid="share-button"', () => {
    render(<BottomStatusBar />)
    expect(screen.getByTestId('share-button')).toBeInTheDocument()
  })

  it('share button is icon-only (Share SVG)', () => {
    render(<BottomStatusBar />)
    const btn = screen.getByTestId('share-button') as HTMLButtonElement
    expect(btn.querySelector('svg')).toBeInTheDocument()
    expect(btn.textContent).toBe('')
  })

  it('footer does not have border-t class', () => {
    render(<BottomStatusBar />)
    const footer = screen.getByTestId('bottom-bar')
    expect(footer).not.toHaveClass('border-t')
  })

  it('clicking share shows toast and copies placeholder URL', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    })
    const { toast } = await import('sonner')
    vi.clearAllMocks()
    render(<BottomStatusBar />)
    const btn = screen.getByTestId('share-button')
    await fireEvent.click(btn)
    expect(mockWriteText).toHaveBeenCalledWith('https://placeholder.local')
    expect(toast.info).toHaveBeenCalled()
  })
})
