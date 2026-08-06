import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useProgressSocket } from './useProgressSocket'
import * as fileStoreModule from '../stores/fileStore'

const mockUpdateFileProgress = vi.fn()
const mockUpdateFileStatus = vi.fn()

vi.mock('../stores/fileStore', () => ({
  useFileStore: {
    getState: vi.fn(),
  },
}))

describe('useProgressSocket', () => {
  let openCalls: string[]
  let wsInstances: any[]
  let mockClose: ReturnType<typeof vi.fn>
  let mockSend: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    openCalls = []
    wsInstances = []
    mockClose = vi.fn()
    mockSend = vi.fn()

    const mockStore = fileStoreModule.useFileStore as unknown as { getState: ReturnType<typeof vi.fn> }
    mockStore.getState.mockReturnValue({
      updateFileProgress: mockUpdateFileProgress,
      updateFileStatus: mockUpdateFileStatus,
    })

    class MockWebSocket {
      url: string
      onopen: ((event: Event) => void) | null = null
      onmessage: ((event: MessageEvent) => void) | null = null
      onerror: ((event: Event) => void) | null = null
      onclose: ((event: CloseEvent) => void) | null = null
      readyState = 1

      addEventListener = vi.fn()
      removeEventListener = vi.fn()

      constructor(url: string) {
        this.url = url
        openCalls.push(url)
        wsInstances.push(this)
      }

      send = mockSend
      close = mockClose
    }

    const _global = typeof globalThis !== 'undefined' ? globalThis : ({} as any)
    ;(_global as any).WebSocket = MockWebSocket
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should connect to the WebSocket URL on mount', async () => {
    renderHook(() => useProgressSocket())
    await waitFor(() => {
      expect(openCalls).toContain('ws://127.0.0.1:8000/ws/progress')
    })
  })

  it('should call updateFileProgress when receiving a progress message with task_id', async () => {
    renderHook(() => useProgressSocket())

    await waitFor(() => {
      expect(wsInstances.length).toBeGreaterThan(0)
    })

    act(() => {
      wsInstances[0].onmessage?.({
        data: JSON.stringify({ task_id: 'job-123', progress: 45 }),
      } as MessageEvent)
    })

    expect(mockUpdateFileProgress).toHaveBeenCalledWith('job-123', 45)
  })

  it('should call updateFileStatus when receiving a status message with task_id', async () => {
    renderHook(() => useProgressSocket())

    await waitFor(() => {
      expect(wsInstances.length).toBeGreaterThan(0)
    })

    act(() => {
      wsInstances[0].onmessage?.({
        data: JSON.stringify({ task_id: 'job-456', status: 'completed' }),
      } as MessageEvent)
    })

    expect(mockUpdateFileStatus).toHaveBeenCalledWith('job-456', 'completed')
  })

  it('should handle invalid JSON gracefully', async () => {
    renderHook(() => useProgressSocket())

    await waitFor(() => {
      expect(wsInstances.length).toBeGreaterThan(0)
    })

    act(() => {
      wsInstances[0].onmessage?.({ data: 'not-json' } as MessageEvent)
    })

    expect(mockUpdateFileProgress).not.toHaveBeenCalled()
    expect(mockUpdateFileStatus).not.toHaveBeenCalled()
  })

  it('should close the WebSocket on unmount', async () => {
    const { unmount } = renderHook(() => useProgressSocket())

    await waitFor(() => {
      expect(wsInstances.length).toBeGreaterThan(0)
    })

    unmount()
    expect(mockClose).toHaveBeenCalled()
  })

  it('should not call store methods when message lacks task_id', async () => {
    renderHook(() => useProgressSocket())

    await waitFor(() => {
      expect(wsInstances.length).toBeGreaterThan(0)
    })

    act(() => {
      wsInstances[0].onmessage?.({
        data: JSON.stringify({ progress: 45 }),
      } as MessageEvent)
    })

    expect(mockUpdateFileProgress).not.toHaveBeenCalled()
    expect(mockUpdateFileStatus).not.toHaveBeenCalled()
  })
})
