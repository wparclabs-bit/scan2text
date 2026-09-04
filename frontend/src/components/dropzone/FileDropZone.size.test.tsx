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

// Mock uploadFile
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

// Mock Tauri invoke for get_file_metadata_command
const mockInvoke = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}))

const { useScan2TextStore } = await import('@/stores/scan2text.store')
const { toast } = await import('sonner')
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

describe('FileDropZone size validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvoke.mockReset()
    uploadFileMock.mockResolvedValue({ task_id: 'test-task-id' })
    const storeMock = useScan2TextStore as unknown as ReturnType<typeof vi.fn>
    storeMock.mockImplementation((selector: (state: any) => any) => {
      const state = { addJob: mockAddJob }
      return selector(state)
    })
  })

  function setupTauri() {
    Object.defineProperty(window, '__TAURI__', {
      value: { version: '2.0.0' },
      writable: true,
      configurable: true,
    })
  }

  function teardownTauri() {
    delete (window as any).__TAURI__
  }

  it('should not add oversized valid-extension file to queue', async () => {
    setupTauri()
    mockInvoke.mockImplementation(async (_cmd: string, { paths }: { paths: string[] }) =>
      paths.map(p => ({ path: p, size: MAX_FILE_SIZE + 1, exists: true }))
    )

    await handleDroppedPaths(['C:/Users/Test/big.png'], deps)

    expect(mockInvoke).toHaveBeenCalledWith('get_file_metadata_command', expect.any(Object))
    expect(uploadFileMock).not.toHaveBeenCalled()
    expect(mockAddJob).not.toHaveBeenCalled()
    teardownTauri()
  })

  it('should add only valid files from a mixed batch and show ONE aggregated warning toast', async () => {
    setupTauri()
    mockInvoke.mockImplementation(async (_cmd: string, { paths }: { paths: string[] }) =>
      paths.map(p => ({
        path: p,
        size: p.includes('big') ? MAX_FILE_SIZE + 1 : 1024,
        exists: true,
      }))
    )

    await handleDroppedPaths([
      'C:/Users/Test/small.png',
      'C:/Users/Test/big.jpg'
    ], deps)

    expect(uploadFileMock).toHaveBeenCalledTimes(1)
    expect(mockAddJob).toHaveBeenCalledTimes(1)
    expect(mockAddJob).toHaveBeenCalledWith(expect.objectContaining({ fileName: 'small.png' }))
    expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('errors.batchSkipped'))
    // Only ONE warning toast, not per-file
    const warningCalls = (toast.warning as ReturnType<typeof vi.fn>).mock.calls
    expect(warningCalls.length).toBe(1)
    teardownTauri()
  })

  it('should show ONE aggregated error toast when all files are oversized', async () => {
    setupTauri()
    mockInvoke.mockImplementation(async (_cmd: string, { paths }: { paths: string[] }) =>
      paths.map(p => ({ path: p, size: MAX_FILE_SIZE + 1, exists: true }))
    )

    await handleDroppedPaths([
      'C:/Users/Test/big1.png',
      'C:/Users/Test/big2.jpg'
    ], deps)

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('errors.allInvalid'))
    expect(uploadFileMock).not.toHaveBeenCalled()
    expect(mockAddJob).not.toHaveBeenCalled()
    teardownTauri()
  })

  it('should add valid files when all pass size check', async () => {
    setupTauri()
    mockInvoke.mockImplementation(async (_cmd: string, { paths }: { paths: string[] }) =>
      paths.map(p => ({ path: p, size: 1024, exists: true }))
    )

    await handleDroppedPaths([
      'C:/Users/Test/a.png',
      'C:/Users/Test/b.pdf'
    ], deps)

    expect(uploadFileMock).toHaveBeenCalledTimes(2)
    expect(mockAddJob).toHaveBeenCalledTimes(2)
    expect(toast.error).not.toHaveBeenCalled()
    expect(toast.warning).not.toHaveBeenCalled()
    teardownTauri()
  })

  it('should treat missing file metadata as invalid (never enters queue)', async () => {
    setupTauri()
    mockInvoke.mockImplementation(async (_cmd: string, { paths }: { paths: string[] }) =>
      paths.map(p => ({ path: p, size: null, exists: false }))
    )

    await handleDroppedPaths(['C:/Users/Test/missing.png'], deps)

    expect(uploadFileMock).not.toHaveBeenCalled()
    expect(mockAddJob).not.toHaveBeenCalled()
    teardownTauri()
  })
})
