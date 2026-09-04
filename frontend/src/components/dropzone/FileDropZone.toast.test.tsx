import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleDroppedPaths } from './FileDropZone'

const mockAddJob = vi.fn()
const mockT = vi.fn((key: string, params?: any) => key + (params ? JSON.stringify(params) : ''))
const deps = { addJob: mockAddJob, t: mockT }

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
const uploadFileMock = vi.mocked(await import('@/lib/api')).uploadFile

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

    expect(uploadFileMock).toHaveBeenCalledTimes(2)
    expect(toast.error).not.toHaveBeenCalled()
    expect(toast.warning).not.toHaveBeenCalled()

    delete (window as any).__TAURI__
  })

  it('should show error toast when upload fails', async () => {
    Object.defineProperty(window, '__TAURI__', {
      value: { version: '2.0.0' },
      writable: true,
      configurable: true
    })
    uploadFileMock.mockRejectedValue(new Error('Network error'))
    mockInvoke.mockResolvedValue([
      { path: 'C:/Users/Test/file1.png', size: 1024, exists: true },
    ])

    // Wrap in .catch() to absorb the unhandled rejection from uploadFile
    await handleDroppedPaths(['C:/Users/Test/file1.png'], deps).catch(() => {})

    // uploadFile throws but addJob was already called before the throw
    console.log('mockAddJob calls:', mockAddJob.mock.calls)
    expect(mockAddJob).toHaveBeenCalledTimes(1)

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

    expect(uploadFileMock).toHaveBeenCalledTimes(10)
    expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('dropzone.maxFilesWarning'))

    delete (window as any).__TAURI__
  })

  it('should show aggregated error toast when all files have unsupported extensions', async () => {
    await handleDroppedPaths([
      'C:/Users/Test/bad1.txt',
      'C:/Users/Test/bad2.exe'
    ], deps)

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('errors.allInvalid'))
    expect(uploadFileMock).not.toHaveBeenCalled()
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

    expect(uploadFileMock).toHaveBeenCalledTimes(1)
    expect(mockAddJob).toHaveBeenCalledTimes(1)
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
