import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleDroppedPaths } from './FileDropZone'

const mockAddJob = vi.fn()
const mockStartNextPendingJob = vi.fn()
const mockT = vi.fn((key: string, params?: any) => key + (params ? JSON.stringify(params) : ''))
const deps = { addJob: mockAddJob, startNextPendingJob: mockStartNextPendingJob, t: mockT }

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

// Mock Tauri webview getCurrentWindow for drag-drop listener (same pattern as FileDropZone.test.tsx)
const mockGetCurrentWindow = vi.fn().mockReturnValue({
  onDragDropEvent: vi.fn().mockResolvedValue(vi.fn()),
})
vi.mock('@tauri-apps/api/webview', () => ({
  getCurrentWindow: (...args: any[]) => mockGetCurrentWindow(...args),
}))

// Mock LOCAL seam module instead of node_modules plugin
const { pickFilesViaDialog: mockPickFilesViaDialog } = vi.hoisted(() => ({
  pickFilesViaDialog: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/lib/filePicker', () => ({
  pickFilesViaDialog: (...args: any[]) => mockPickFilesViaDialog(...args),
}))

// Mock Tauri invoke for get_file_metadata_command — use mutable fn so tests can reconfigure via .mockResolvedValue/.mockRejectedValue
const mockInvoke = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}))

const { useScan2TextStore } = await import('@/stores/scan2text.store')
const { toast } = await import('sonner')

describe('FileDropZone toast errors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvoke.mockReset()
    const storeMock = useScan2TextStore as unknown as ReturnType<typeof vi.fn>
    storeMock.mockImplementation((selector: (state: any) => any) => {
      const state = {
        addJob: mockAddJob,
        startNextPendingJob: mockStartNextPendingJob,
      }
      return selector(state)
    })
  })

  it('should show error toast when all paths are invalid (non-Windows)', async () => {
    await handleDroppedPaths([
      'relative/path/test.txt',
      '/unix/photo.jpg'
    ], deps)

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('errors.invalidPath'))
    expect(mockAddJob).not.toHaveBeenCalled()
  })

  it('should not show any toast when valid Windows paths are dropped', async () => {
    Object.defineProperty(window, '__TAURI__', {
      value: { version: '2.0.0' },
      writable: true,
      configurable: true
    })
    mockInvoke.mockResolvedValue([
      { path: 'C:/Users/Test/file1.png', size: 1024, exists: true },
      { path: 'D:/Pictures/photo.jpg', size: 2048, exists: true },
    ])

    await handleDroppedPaths([
      'C:/Users/Test/file1.png',
      'D:/Pictures/photo.jpg'
    ], deps)

    expect(mockAddJob).toHaveBeenCalledTimes(2)
    // Verify addJob receives real metadata sizes, not hardcoded 0
    const jobCalls = mockAddJob.mock.calls.map((c: any[]) => c[0])
    expect(jobCalls.every((j: any) => j.fileSize != null && j.fileSize > 0)).toBe(true)
    expect(toast.error).not.toHaveBeenCalled()
    expect(toast.warning).not.toHaveBeenCalled()

    delete (window as any).__TAURI__
  })

  it('should not show error toast when upload fails — errors are handled by the store', async () => {
    Object.defineProperty(window, '__TAURI__', {
      value: { version: '2.0.0' },
      writable: true,
      configurable: true
    })
    mockInvoke.mockResolvedValue([
      { path: 'C:/Users/Test/file1.png', size: 1024, exists: true },
    ])

    // handleDroppedPaths no longer calls uploadFile directly; it delegates to the store.
    await handleDroppedPaths(['C:/Users/Test/file1.png'], deps)

    // addJob should have been called with correct metadata
    expect(mockAddJob).toHaveBeenCalledTimes(1)
    expect(mockAddJob).toHaveBeenCalledWith(expect.objectContaining({ fileName: 'file1.png', fileSize: 1024 }))
    // No error toast from handleDroppedPaths itself — store handles upload errors asynchronously
    expect(toast.error).not.toHaveBeenCalled()

    delete (window as any).__TAURI__
  })

  it('should limit to 10 files and show warning toast for extras', async () => {
    Object.defineProperty(window, '__TAURI__', {
      value: { version: '2.0.0' },
      writable: true,
      configurable: true
    })
    const allPaths = Array.from({ length: 12 }, (_, i) => `C:/Users/Test/file-${i}.png`)
    mockInvoke.mockImplementation(async (_cmd: string, { paths }: { paths: string[] }) =>
      paths.map(p => ({ path: p, size: 1024, exists: true }))
    )

    await handleDroppedPaths(allPaths, deps)

    // First 10 files are kept, extras skipped with warning toast
    expect(mockAddJob).toHaveBeenCalledTimes(10)
    const jobCalls = mockAddJob.mock.calls.map((c: any[]) => c[0])
    expect(jobCalls.every((j: any) => j.fileSize === 1024)).toBe(true)
    expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('dropzone.maxFilesWarning'))

    delete (window as any).__TAURI__
  })

  it('should show aggregated error toast when all files have unsupported extensions', async () => {
    await handleDroppedPaths([
      'C:/Users/Test/bad1.txt',
      'C:/Users/Test/bad2.exe'
    ], deps)

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('errors.allInvalid'))
    expect(mockAddJob).not.toHaveBeenCalled()
  })

  it('should show one aggregated toast for mixed valid/invalid batch', async () => {
    Object.defineProperty(window, '__TAURI__', {
      value: { version: '2.0.0' },
      writable: true,
      configurable: true
    })
    mockInvoke.mockImplementation(async (_cmd: string, { paths }: { paths: string[] }) =>
      paths.map(p => ({ path: p, size: 1024, exists: true }))
    )

    await handleDroppedPaths([
      'C:/Users/Test/good.png',
      'C:/Users/Test/bad.txt'
    ], deps)

    expect(mockAddJob).toHaveBeenCalledTimes(1)
    expect(mockAddJob).toHaveBeenCalledWith(expect.objectContaining({ fileName: 'good.png', fileSize: 1024 }))
    expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('errors.batchSkipped'))
    const errorCalls = (toast.error as ReturnType<typeof vi.fn>).mock.calls
    expect(errorCalls.length).toBe(0)

    delete (window as any).__TAURI__
  })

  it('should not call addJob for invalid extension files', async () => {
    Object.defineProperty(window, '__TAURI__', {
      value: { version: '2.0.0' },
      writable: true,
      configurable: true
    })
    mockInvoke.mockImplementation(async (_cmd: string, { paths }: { paths: string[] }) =>
      paths.map(p => ({ path: p, size: 1024, exists: true }))
    )

    await handleDroppedPaths([
      'C:/Users/Test/valid.jpg',
      'C:/Users/Test/invalid.bmp'
    ], deps)

    expect(mockAddJob).toHaveBeenCalledTimes(1)
    expect(mockAddJob).toHaveBeenCalledWith(expect.objectContaining({ fileName: 'valid.jpg' }))

    delete (window as any).__TAURI__
  })
})
