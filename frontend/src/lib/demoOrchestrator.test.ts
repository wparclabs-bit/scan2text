import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { startDemoOrchestrator } from './demoOrchestrator'
import { useScan2TextStore } from '../stores/scan2text.store'

const mockStartUpload = vi.hoisted(() => vi.fn())
const mockSetState = vi.hoisted(() => vi.fn())

vi.mock('../stores/scan2text.store', () => ({
  useScan2TextStore: {
    getState: () => ({
      jobs: {},
      activeJobId: null,
      jobOrder: [],
      startUpload: mockStartUpload,
      setState: mockSetState,
    }),
    setState: mockSetState,
  },
}))

vi.mock('./demoMode', () => ({
  IS_DEMO_MODE: true,
}))

describe('startDemoOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls startUpload for the first pending job immediately', () => {
    const file = new File(['a'], 'test.png', { type: 'image/png' })
    ;(useScan2TextStore as any).getState = () => ({
      jobs: { 'job-1': { id: 'job-1', fileName: 'test.png', status: 'pending', file } },
      activeJobId: null,
      jobOrder: ['job-1'],
      startUpload: mockStartUpload,
      setState: mockSetState,
    })

    startDemoOrchestrator()
    expect(mockStartUpload).toHaveBeenCalledWith({ file, jobId: 'job-1' })
  })

  it('does not call startUpload when an active job is still processing', () => {
    const file = new File(['a'], 'test.png', { type: 'image/png' })
    ;(useScan2TextStore as any).getState = () => ({
      jobs: {
        'job-1': { id: 'job-1', fileName: 'test.png', status: 'processing', file },
        'job-2': { id: 'job-2', fileName: 'test2.png', status: 'pending', file },
      },
      activeJobId: 'job-1',
      jobOrder: ['job-1', 'job-2'],
      startUpload: mockStartUpload,
      setState: mockSetState,
    })

    startDemoOrchestrator()
    expect(mockStartUpload).not.toHaveBeenCalled()
  })

  it('clears interval on cleanup', () => {
    const clearInterval = vi.fn()
    globalThis.setInterval = clearInterval as unknown as typeof setInterval
    const file = new File(['a'], 'test.png', { type: 'image/png' })
    ;(useScan2TextStore as any).getState = () => ({
      jobs: { 'job-1': { id: 'job-1', fileName: 'test.png', status: 'pending', file } },
      activeJobId: null,
      jobOrder: ['job-1'],
      startUpload: mockStartUpload,
      setState: mockSetState,
    })

    const cleanup = startDemoOrchestrator()
    cleanup!()
    expect(clearInterval).toHaveBeenCalled()
  })

  it('does not call startUpload when no pending jobs exist', () => {
    ;(useScan2TextStore as any).getState = () => ({
      jobs: {},
      activeJobId: null,
      jobOrder: [],
      startUpload: mockStartUpload,
      setState: mockSetState,
    })
    startDemoOrchestrator()
    expect(mockStartUpload).not.toHaveBeenCalled()
  })
})
