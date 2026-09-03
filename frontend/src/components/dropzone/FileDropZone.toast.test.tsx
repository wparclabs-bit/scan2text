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
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('errors.invalidPath'))
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

  it('should limit to 10 files and not show warning toast', async () => {
    // Mock Tauri environment
    Object.defineProperty(window, '__TAURI__', {
      value: { version: '1.0.0' },
      writable: true,
      configurable: true
    })

    render(<FileDropZone />)
    const dropzone = document.querySelector('[data-testid="dropzone-dashed"]')!
    const files = Array.from({ length: 12 }, (_, i) => ({ path: `C:/Users/Test/file-${i}.png` }))
    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: { files }
    } as unknown as React.DragEvent<HTMLDivElement>

    fireEvent.drop(dropzone, mockEvent)

    // Should only process 10 files
    await vi.waitFor(() => {
      expect(uploadFileMock).toHaveBeenCalledTimes(10)
    })
    // No warning toast should be shown (silently truncates)
    expect(toast.warning).not.toHaveBeenCalled()

    // Clean up
    delete (window as any).__TAURI__
  })
})
