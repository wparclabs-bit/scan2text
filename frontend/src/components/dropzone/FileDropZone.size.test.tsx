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

// Mock uploadFile
vi.mock('@/lib/api', () => {
  const mockFn = vi.fn().mockResolvedValue({ task_id: 'test-task-id' })
  return { uploadFile: mockFn }
})

const uploadFileMock = vi.mocked(await import('@/lib/api')).uploadFile
const { toast } = await import('sonner')
const { useScan2TextStore } = await import('@/stores/scan2text.store')

// Mock Tauri invoke for get_file_metadata_command
const mockInvoke = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}))

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
      value: { version: '1.0.0' },
      writable: true,
      configurable: true,
    })
  }

  function teardownTauri() {
    delete (window as any).__TAURI__
  }

  it('should not add oversized valid-extension file to queue', async () => {
    setupTauri()
    mockInvoke.mockResolvedValue([
      { path: 'C:/Users/Test/big.png', size: MAX_FILE_SIZE + 1, exists: true },
    ])

    render(<FileDropZone />)
    const dropzone = document.querySelector('[data-testid="dropzone-dashed"]')!
    const file = Object.assign(new File([''], 'big.png'), { path: 'C:/Users/Test/big.png' })
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } })

    await vi.waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('get_file_metadata_command', expect.any(Object))
    })
    expect(uploadFileMock).not.toHaveBeenCalled()
    expect(mockAddJob).not.toHaveBeenCalled()
    teardownTauri()
  })

  it('should add only valid files from a mixed batch and show ONE aggregated warning toast', async () => {
    setupTauri()
    mockInvoke.mockResolvedValue([
      { path: 'C:/Users/Test/small.png', size: 1024, exists: true },
      { path: 'C:/Users/Test/big.jpg', size: MAX_FILE_SIZE + 1, exists: true },
    ])

    render(<FileDropZone />)
    const dropzone = document.querySelector('[data-testid="dropzone-dashed"]')!
    const files = [
      Object.assign(new File([''], 'small.png'), { path: 'C:/Users/Test/small.png' }),
      Object.assign(new File([''], 'big.jpg'), { path: 'C:/Users/Test/big.jpg' }),
    ]
    fireEvent.drop(dropzone, { dataTransfer: { files } })

    await vi.waitFor(() => {
      expect(uploadFileMock).toHaveBeenCalledTimes(1)
      expect(mockAddJob).toHaveBeenCalledTimes(1)
      expect(mockAddJob).toHaveBeenCalledWith(expect.objectContaining({ fileName: 'small.png' }))
    })
    expect(toast.warning).toHaveBeenCalledWith(
      '1 files were skipped: 0 unsupported type(s), 1 too large.'
    )
    // Only ONE warning toast, not per-file
    const warningCalls = (toast.warning as ReturnType<typeof vi.fn>).mock.calls
    expect(warningCalls.length).toBe(1)
    teardownTauri()
  })

  it('should show ONE aggregated error toast when all files are oversized', async () => {
    setupTauri()
    mockInvoke.mockResolvedValue([
      { path: 'C:/Users/Test/big1.png', size: MAX_FILE_SIZE + 1, exists: true },
      { path: 'C:/Users/Test/big2.jpg', size: MAX_FILE_SIZE + 100, exists: true },
    ])

    render(<FileDropZone />)
    const dropzone = document.querySelector('[data-testid="dropzone-dashed"]')!
    const files = [
      Object.assign(new File([''], 'big1.png'), { path: 'C:/Users/Test/big1.png' }),
      Object.assign(new File([''], 'big2.jpg'), { path: 'C:/Users/Test/big2.jpg' }),
    ]
    fireEvent.drop(dropzone, { dataTransfer: { files } })

    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'All selected files are unsupported or too large.'
      )
      expect(uploadFileMock).not.toHaveBeenCalled()
      expect(mockAddJob).not.toHaveBeenCalled()
    })
    teardownTauri()
  })

  it('should add valid files when all pass size check', async () => {
    setupTauri()
    mockInvoke.mockResolvedValue([
      { path: 'C:/Users/Test/a.png', size: 500, exists: true },
      { path: 'C:/Users/Test/b.pdf', size: 1000, exists: true },
    ])

    render(<FileDropZone />)
    const dropzone = document.querySelector('[data-testid="dropzone-dashed"]')!
    const files = [
      Object.assign(new File([''], 'a.png'), { path: 'C:/Users/Test/a.png' }),
      Object.assign(new File([''], 'b.pdf'), { path: 'C:/Users/Test/b.pdf' }),
    ]
    fireEvent.drop(dropzone, { dataTransfer: { files } })

    await vi.waitFor(() => {
      expect(uploadFileMock).toHaveBeenCalledTimes(2)
      expect(mockAddJob).toHaveBeenCalledTimes(2)
    })
    expect(toast.error).not.toHaveBeenCalled()
    expect(toast.warning).not.toHaveBeenCalled()
    teardownTauri()
  })

  it('should treat missing file metadata as invalid (never enters queue)', async () => {
    setupTauri()
    mockInvoke.mockResolvedValue([
      { path: 'C:/Users/Test/missing.png', size: null, exists: false },
    ])

    render(<FileDropZone />)
    const dropzone = document.querySelector('[data-testid="dropzone-dashed"]')!
    const file = Object.assign(new File([''], 'missing.png'), { path: 'C:/Users/Test/missing.png' })
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } })

    await vi.waitFor(() => {
      expect(uploadFileMock).not.toHaveBeenCalled()
      expect(mockAddJob).not.toHaveBeenCalled()
    })
    teardownTauri()
  })
})
