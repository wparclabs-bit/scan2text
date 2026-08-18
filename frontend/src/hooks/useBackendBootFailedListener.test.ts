import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useBackendBootFailedListener } from './useBackendBootFailedListener'

type UnlistenFn = () => void
type ListenFn = (event: string, callback: (payload: any) => void) => Promise<UnlistenFn>

const { mockListen, mockToastError } = vi.hoisted(() => ({
  mockListen: vi.fn<ListenFn>(() => Promise.resolve(() => {})),
  mockToastError: vi.fn(),
}))

vi.mock('@/stores/scan2text.store', () => ({
  useScan2TextStore: vi.fn(),
}))

vi.mock('sonner', () => ({
  Toaster: () => null,
  toast: {
    error: mockToastError,
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: mockListen,
}))

const { toast } = await import('sonner')

describe('useBackendBootFailedListener', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers a Tauri event listener for backend-boot-failed on mount', () => {
    renderHook(() => useBackendBootFailedListener())
    expect(mockListen).toHaveBeenCalledWith('backend-boot-failed', expect.any(Function))
  })

  it('calls toast.error with the translated boot-failed message when backend-boot-failed fires', async () => {
    mockListen.mockImplementationOnce((event: string, fn: (payload: any) => void) => {
      expect(event).toBe('backend-boot-failed')
      expect(typeof fn).toBe('function')
      fn({ payload: 'Backend exited within 5s of spawn' })
      return Promise.resolve(() => {})
    })

    renderHook(() => useBackendBootFailedListener())

    await new Promise((r) => setTimeout(r, 0))

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Backend failed to start'))
  })

  it('calls the unsubscribe function on unmount', async () => {
    const mockUnsubscribe = vi.fn<UnlistenFn>()
    mockListen.mockResolvedValue(mockUnsubscribe)

    const { unmount } = renderHook(() => useBackendBootFailedListener())
    await Promise.resolve()
    unmount()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })
})
