import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DropZone from './DropZone'

const mockStartUpload = vi.fn()
const mockPollJob = vi.fn()
const mockJobs: Record<string, any> = {
  'opt-1': { id: 'opt-1', fileName: 'scan.pdf', taskId: null, status: 'pending', isBackground: false, createdAt: 1, resultMarkdown: null, error: null },
  'opt-2': { id: 'opt-2', fileName: 'image.png', taskId: 'job-abc', status: 'processing', isBackground: false, createdAt: 2, resultMarkdown: null, error: null },
  'opt-3': { id: 'opt-3', fileName: 'doc.pdf', taskId: 'job-def', status: 'completed', isBackground: false, createdAt: 3, resultMarkdown: '# Result', error: null },
  'opt-4': { id: 'opt-4', fileName: 'failed.pdf', taskId: null, status: 'failed', isBackground: false, createdAt: 4, resultMarkdown: null, error: 'Upload failed' },
}

vi.mock('../stores/scan2text.store', () => ({
  useScan2TextStore: vi.fn(),
}))

const { useScan2TextStore } = await import('../stores/scan2text.store')

describe('DropZone', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const storeMock = useScan2TextStore as unknown as ReturnType<typeof vi.fn>
    storeMock.mockImplementation((selector: (state: any) => any) => {
      const state = {
        jobs: mockJobs,
        startUpload: mockStartUpload,
        pollJob: mockPollJob,
      }
      return selector(state)
    })
    mockStartUpload.mockResolvedValue('new-job-id')
    mockPollJob.mockResolvedValue(undefined)
  })

  it('should render a Card component', () => {
    render(<DropZone />)
    expect(screen.getByText('Upload Files')).toBeInTheDocument()
  })

  it('should render a file input', () => {
    render(<DropZone />)
    expect(screen.getByLabelText(/upload/i)).toBeInTheDocument()
  })

  it('should call startUpload and pollJob when a file is selected via input', async () => {
    render(<DropZone />)
    const input = screen.getByLabelText(/upload/i) as HTMLInputElement

    fireEvent.change(input, {
      target: { files: [new File(['content'], 'test.pdf', { type: 'application/pdf' })] },
    })

    await vi.waitFor(() => {
      expect(mockStartUpload).toHaveBeenCalledWith({ file: expect.any(File) })
    })
    expect(mockPollJob).toHaveBeenCalledWith({ jobId: 'new-job-id' })
  })

  it('should render job names from the store', () => {
    render(<DropZone />)
    expect(screen.getByText('scan.pdf')).toBeInTheDocument()
    expect(screen.getByText('image.png')).toBeInTheDocument()
    expect(screen.getByText('doc.pdf')).toBeInTheDocument()
  })

  it('should display status for each job', () => {
    render(<DropZone />)
    expect(screen.getByText(/pending/)).toBeInTheDocument()
    expect(screen.getByText(/processing/)).toBeInTheDocument()
    expect(screen.getByText(/completed/)).toBeInTheDocument()
  })

  it('should show taskId when available', () => {
    render(<DropZone />)
    expect(screen.getByText(/job-abc/)).toBeInTheDocument()
    expect(screen.getByText(/job-def/)).toBeInTheDocument()
  })

  it('should call startUpload and pollJob on drag-and-drop', async () => {
    const { container } = render(<DropZone />)
    const dropTarget = container.querySelector('div.rounded-lg') as HTMLElement | null

    const file1 = new File(['content1'], 'drag1.png', { type: 'image/png' })
    const file2 = new File(['content2'], 'drag2.pdf', { type: 'application/pdf' })

    fireEvent.dragOver(dropTarget!, {
      dataTransfer: { files: [file1, file2], items: [], types: ['Files'] },
    })
    fireEvent.drop(dropTarget!, {
      dataTransfer: { files: [file1, file2], items: [], types: ['Files'] },
    })

    await vi.waitFor(() => {
      expect(mockStartUpload).toHaveBeenCalledTimes(2)
    })
    expect(mockPollJob).toHaveBeenCalledTimes(2)
  })

  it('should display error message on failed job cards', () => {
    render(<DropZone />)
    expect(screen.getByText('Upload failed')).toBeInTheDocument()
  })
})
