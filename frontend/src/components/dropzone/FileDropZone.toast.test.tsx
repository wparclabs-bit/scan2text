import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import FileDropZone from './FileDropZone'

const mockAddJob = vi.fn()
const mockStartUpload = vi.fn().mockResolvedValue('job-test-id')
const mockOnFileAdd = vi.fn()

vi.mock('@/stores/scan2text.store', () => ({
  useScan2TextStore: vi.fn(),
}))

vi.mock('sonner', () => ({
  Toaster: () => null,
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}))

const { useScan2TextStore } = await import('@/stores/scan2text.store')
const { toast } = await import('sonner')

describe('FileDropZone toast errors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const storeMock = useScan2TextStore as unknown as ReturnType<typeof vi.fn>
    storeMock.mockImplementation((selector: (state: any) => any) => {
      const state = {
        addJob: mockAddJob,
        startUpload: mockStartUpload,
      }
      return selector(state)
    })
  })

  it('should show aggregated warning toast for invalid MIME type in mixed batch', async () => {
    render(<FileDropZone />)
    const dropzone = document.querySelector('[data-testid="dropzone"]')!
    const txtFile = new File(['content'], 'test.txt', { type: 'text/plain' })
    const pngFile = new File(['content'], 'valid.png', { type: 'image/png' })

    fireEvent.drop(dropzone, { dataTransfer: { files: [txtFile, pngFile] } })

    await vi.waitFor(() => {
      expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('1 files were skipped'))
    })
    expect(mockAddJob).toHaveBeenCalledTimes(1)
  })

  it('should show aggregated warning toast for invalid extension in mixed batch', async () => {
    render(<FileDropZone />)
    const dropzone = document.querySelector('[data-testid="dropzone"]')!
    const exeFile = new File(['content'], 'malware.exe', { type: 'application/octet-stream' })
    const pdfFile = new File(['content'], 'valid.pdf', { type: 'application/pdf' })

    fireEvent.drop(dropzone, { dataTransfer: { files: [exeFile, pdfFile] } })

    await vi.waitFor(() => {
      expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('1 files were skipped'))
    })
    expect(mockAddJob).toHaveBeenCalledTimes(1)
  })

  it('should show aggregated warning toast for oversized file in mixed batch', async () => {
    render(<FileDropZone />)
    const dropzone = document.querySelector('[data-testid="dropzone"]')!
    const bytes = 50 * 1024 * 1024 + 1
    const bigFile = new File([new ArrayBuffer(bytes)], 'big.png', { type: 'image/png' })
    Object.defineProperty(bigFile, 'size', { value: bytes })
    const smallPng = new File(['content'], 'small.png', { type: 'image/png' })

    fireEvent.drop(dropzone, { dataTransfer: { files: [bigFile, smallPng] } })

    await vi.waitFor(() => {
      expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('1 files were skipped'))
      expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('too large'))
    })
    expect(mockAddJob).toHaveBeenCalledTimes(1)
  })

  it('should show all-invalid warning toast when all files are invalid', async () => {
    render(<FileDropZone />)
    const dropzone = document.querySelector('[data-testid="dropzone"]')!
    const txtFile = new File(['content'], 'test.txt', { type: 'text/plain' })
    const exeFile = new File(['content'], 'malware.exe', { type: 'application/octet-stream' })

    fireEvent.drop(dropzone, { dataTransfer: { files: [txtFile, exeFile] } })

    await vi.waitFor(() => {
      expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('No files were added'))
    })
    expect(mockAddJob).not.toHaveBeenCalled()
  })

  it('should not show any toast when all files are valid', async () => {
    render(<FileDropZone />)
    const dropzone = document.querySelector('[data-testid="dropzone"]')!
    const pngFile = new File(['content'], 'valid.png', { type: 'image/png' })
    const pdfFile = new File(['content'], 'valid.pdf', { type: 'application/pdf' })

    fireEvent.drop(dropzone, { dataTransfer: { files: [pngFile, pdfFile] } })

    await vi.waitFor(() => {
      expect(toast.warning).not.toHaveBeenCalled()
      expect(toast.error).not.toHaveBeenCalled()
    })
    expect(mockAddJob).toHaveBeenCalledTimes(2)
  })

  it('should call startUpload for each valid file in a mixed batch', async () => {
    mockStartUpload.mockResolvedValue('job-123')
    render(<FileDropZone onFileAdd={mockOnFileAdd} />)
    const dropzone = document.querySelector('[data-testid="dropzone"]')!
    const txtFile = new File(['content'], 'invalid.txt', { type: 'text/plain' })
    const pngFile = new File(['content'], 'valid.png', { type: 'image/png' })

    fireEvent.drop(dropzone, { dataTransfer: { files: [txtFile, pngFile] } })

    await vi.waitFor(() => {
      expect(mockStartUpload).toHaveBeenCalledWith(
        expect.objectContaining({
          file: pngFile,
          jobId: expect.any(String),
        }),
      )
    })
  })

  it('should show upload failed toast when startUpload rejects', async () => {
    mockStartUpload.mockRejectedValue(new Error('Network error'))
    render(<FileDropZone />)
    const dropzone = document.querySelector('[data-testid="dropzone"]')!
    const pdfFile = new File(['content'], 'doc.pdf', { type: 'application/pdf' })

    fireEvent.drop(dropzone, { dataTransfer: { files: [pdfFile] } })

    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Upload failed'))
    })
  })

  it('should not call onFileAdd when startUpload fails', async () => {
    mockStartUpload.mockRejectedValue(new Error('Network error'))
    render(<FileDropZone onFileAdd={mockOnFileAdd} />)
    const dropzone = document.querySelector('[data-testid="dropzone"]')!
    const pdfFile = new File(['content'], 'doc.pdf', { type: 'application/pdf' })

    fireEvent.drop(dropzone, { dataTransfer: { files: [pdfFile] } })

    await vi.waitFor(() => {
      expect(mockOnFileAdd).not.toHaveBeenCalled()
    })
  })

  it('should fire max-files warning toast and create exactly 10 jobs when 12 valid files are dropped', async () => {
    render(<FileDropZone />)
    const dropzone = document.querySelector('[data-testid="dropzone"]')!
    const files = Array.from({ length: 12 }, (_, i) => new File(['x'], `file-${i}.png`, { type: 'image/png' }))

    fireEvent.drop(dropzone, { dataTransfer: { files } })

    await vi.waitFor(() => {
      expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('Max 10 files per batch'))
      expect(mockAddJob).toHaveBeenCalledTimes(10)
    })
  })
})
