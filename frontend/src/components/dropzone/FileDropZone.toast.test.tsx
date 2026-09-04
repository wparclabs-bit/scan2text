import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import FileDropZone from './FileDropZone'

const mockAddJob = vi.fn()

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

// Mock uploadFile - define inline to avoid hoisting issues
vi.mock('@/lib/api', () => {
  const mockFn = vi.fn().mockResolvedValue({ task_id: 'test-task-id' })
  return { uploadFile: mockFn }
})
// Get reference to the mock for per-test configuration
const uploadFileMock = vi.mocked(await import('@/lib/api')).uploadFile

const { useScan2TextStore } = await import('@/stores/scan2text.store')
const { toast } = await import('sonner')

describe('FileDropZone toast errors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    uploadFileMock.mockResolvedValue({ task_id: 'test-task-id' })
    const storeMock = useScan2TextStore as unknown as ReturnType<typeof vi.fn>
    storeMock.mockImplementation((selector: (state: any) => any) => {
      const state = {
        addJob: mockAddJob,
      }
      return selector(state)
    })
  })

  it('should show error toast when all paths are invalid (non-Windows)', async () => {
    render(<FileDropZone />)
    const dropzone = document.querySelector('[data-testid="dropzone-dashed"]')!
    // Use file names that won't match Windows path pattern
    fireEvent.drop(dropzone, { dataTransfer: { files: [{ name: 'test.txt' }, { name: 'photo.jpg' }] } })

    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Invalid file path'))
    })
    expect(mockAddJob).not.toHaveBeenCalled()
  })

  it('should not show any toast when valid Windows paths are dropped', async () => {
    // Mock Tauri environment
    Object.defineProperty(window, '__TAURI__', {
      value: { version: '1.0.0' },
      writable: true,
      configurable: true
    })

    render(<FileDropZone />)
    const dropzone = document.querySelector('[data-testid="dropzone-dashed"]')!
    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        files: [
          { path: 'C:/Users/Test/file1.png' },
          { path: 'D:/Pictures/photo.jpg' }
        ]
      }
    } as unknown as React.DragEvent<HTMLDivElement>

    fireEvent.drop(dropzone, mockEvent)

    // Give async operations time to complete
    await vi.waitFor(() => {
      expect(uploadFileMock).toHaveBeenCalled()
    })
    expect(toast.error).not.toHaveBeenCalled()
    expect(toast.warning).not.toHaveBeenCalled()

    // Clean up
    delete (window as any).__TAURI__
  })

  it('should show error toast when upload fails', async () => {
    // Mock Tauri environment
    Object.defineProperty(window, '__TAURI__', {
      value: { version: '1.0.0' },
      writable: true,
      configurable: true
    })
    uploadFileMock.mockRejectedValue(new Error('Network error'))

    render(<FileDropZone />)
    const dropzone = document.querySelector('[data-testid="dropzone-dashed"]')!
    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        files: [
          { path: 'C:/Users/Test/file1.png' }
        ]
      }
    } as unknown as React.DragEvent<HTMLDivElement>

    fireEvent.drop(dropzone, mockEvent)

    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Upload failed')
    })

    // Clean up
    delete (window as any).__TAURI__
  })

  it('should limit to 10 files and show warning toast for extras', async () => {
    Object.defineProperty(window, '__TAURI__', {
      value: { version: '1.0.0' },
      writable: true,
      configurable: true
    })

    render(<FileDropZone />)
    const dropzone = document.querySelector('[data-testid="dropzone-dashed"]')!
    const files = Array.from({ length: 12 }, (_, i) =>
      Object.assign(new File([''], `file-${i}.png`), { path: `C:/Users/Test/file-${i}.png` })
    )
    fireEvent.drop(dropzone, { dataTransfer: { files } })

    await vi.waitFor(() => {
      expect(uploadFileMock).toHaveBeenCalledTimes(10)
    })
    expect(toast.warning).toHaveBeenCalledWith('Max 10 files per batch — extra files were skipped.')

    delete (window as any).__TAURI__
  })

  it('should show aggregated error toast when all files have unsupported extensions', async () => {
    Object.defineProperty(window, '__TAURI__', {
      value: { version: '1.0.0' },
      writable: true,
      configurable: true
    })

    render(<FileDropZone />)
    const dropzone = document.querySelector('[data-testid="dropzone-dashed"]')!
    const files = [
      Object.assign(new File([''], 'bad1.txt'), { path: 'C:/Users/Test/bad1.txt' }),
      Object.assign(new File([''], 'bad2.exe'), { path: 'C:/Users/Test/bad2.exe' }),
    ]
    fireEvent.drop(dropzone, { dataTransfer: { files } })

    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('All selected files are unsupported or too large.')
      expect(uploadFileMock).not.toHaveBeenCalled()
      expect(mockAddJob).not.toHaveBeenCalled()
    })

    delete (window as any).__TAURI__
  })

  it('should show one aggregated toast for mixed valid/invalid batch', async () => {
    Object.defineProperty(window, '__TAURI__', {
      value: { version: '1.0.0' },
      writable: true,
      configurable: true
    })

    render(<FileDropZone />)
    const dropzone = document.querySelector('[data-testid="dropzone-dashed"]')!
    const files = [
      Object.assign(new File([''], 'good.png'), { path: 'C:/Users/Test/good.png' }),
      Object.assign(new File([''], 'bad.txt'), { path: 'C:/Users/Test/bad.txt' }),
    ]
    fireEvent.drop(dropzone, { dataTransfer: { files } })

    await vi.waitFor(() => {
      expect(uploadFileMock).toHaveBeenCalledTimes(1)
      expect(toast.warning).toHaveBeenCalledWith('1 files were skipped: 1 unsupported type(s), 0 too large.')
      const errorCalls = (toast.error as ReturnType<typeof vi.fn>).mock.calls
      expect(errorCalls.length).toBe(0)
    })

    delete (window as any).__TAURI__
  })

  it('should not call addJob for invalid extension files', async () => {
    Object.defineProperty(window, '__TAURI__', {
      value: { version: '1.0.0' },
      writable: true,
      configurable: true
    })

    render(<FileDropZone />)
    const dropzone = document.querySelector('[data-testid="dropzone-dashed"]')!
    const files = [
      Object.assign(new File([''], 'valid.jpg'), { path: 'C:/Users/Test/valid.jpg' }),
      Object.assign(new File([''], 'invalid.bmp'), { path: 'C:/Users/Test/invalid.bmp' }),
    ]
    fireEvent.drop(dropzone, { dataTransfer: { files } })

    await vi.waitFor(() => {
      expect(mockAddJob).toHaveBeenCalledTimes(1)
      expect(mockAddJob).toHaveBeenCalledWith(expect.objectContaining({ fileName: 'valid.jpg' }))
    })

    delete (window as any).__TAURI__
  })
})
