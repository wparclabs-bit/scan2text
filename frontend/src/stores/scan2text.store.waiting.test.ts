import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  DOCUMENT_CEILING_MS,
  isDocumentCeilingReached,
  useScan2TextStore,
} from './scan2text.store'

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>()
  return {
    ...actual,
    getTaskStatus: vi.fn(),
    getHealth: vi.fn().mockResolvedValue({ status: 'ok' }),
    uploadFile: vi.fn(),
    getSettings: vi.fn().mockResolvedValue({ output_dir: '' }),
    defaultDelay: vi.fn().mockResolvedValue(undefined),
  }
})

const { getTaskStatus, uploadFile } = await import('../lib/api')

describe('T05 — waiting state in the job store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useScan2TextStore.getState().reset()
    ;(getTaskStatus as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      task_id: 't1',
      status: 'processing',
    })
    ;(uploadFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ task_id: 't1' })
  })

  afterEach(() => {
    useScan2TextStore.getState().reset()
  })

  it('test_a_waiting_poll_sets_the_waiting_status_and_reason', async () => {
    ;(getTaskStatus as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      task_id: 't1',
      status: 'waiting',
      reason: 'network',
      error_code: 'NETWORK_UNAVAILABLE',
    })
    const store = useScan2TextStore.getState()
    store.addJob({ id: 'j1', fileName: 'large.pdf', fileSize: 2048 })
    store.setTaskId('j1', 't1')

    await useScan2TextStore.getState().pollJob({ jobId: 'j1' })

    const job = useScan2TextStore.getState().jobs['j1']
    expect(job.status).toBe('waiting')
    expect(job.reason).toBe('network')
    expect(job.errorCode).toBe('NETWORK_UNAVAILABLE')
  })

  it('test_retry_of_a_parked_job_resumes_the_same_job', async () => {
    ;(uploadFile as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'))
    const store = useScan2TextStore.getState()
    store.addJob({ id: 'j1', fileName: 'large.pdf', fileSize: 2048, filePath: 'C:/t/large.pdf' })
    store.parkJob('j1', 'network', 'NETWORK_UNAVAILABLE')

    const returnedId = await useScan2TextStore.getState().retryJob('j1')

    expect(returnedId).toBe('j1')
    expect(Object.keys(useScan2TextStore.getState().jobs)).toEqual(['j1'])
    expect(useScan2TextStore.getState().jobOrder).toEqual(['j1'])
    expect(useScan2TextStore.getState().jobs['j1'].reason).toBeNull()
  })

  it('test_document_ceiling_parks_the_job', () => {
    const now = 1_000_000_000
    expect(isDocumentCeilingReached(now - DOCUMENT_CEILING_MS + 1, now)).toBe(false)
    expect(isDocumentCeilingReached(now - DOCUMENT_CEILING_MS, now)).toBe(true)

    useScan2TextStore.getState().addJob({ id: 'j1', fileName: 'slow.pdf', fileSize: 2048 })
    useScan2TextStore.getState().parkJob('j1', 'ceiling', 'DOCUMENT_TIMEOUT')
    const job = useScan2TextStore.getState().jobs['j1']
    expect(job.status).toBe('waiting')
    expect(job.reason).toBe('ceiling')
    expect(job.errorCode).toBe('DOCUMENT_TIMEOUT')
  })

  it('test_waiting_is_not_a_terminal_transition_blocker', () => {
    const store = useScan2TextStore.getState()
    store.addJob({ id: 'j1', fileName: 'scan.png', fileSize: 2048 })
    store.parkJob('j1', 'network', 'NETWORK_UNAVAILABLE')
    // A parked job can still move on; only completed/failed are hard terminal.
    store.setStatus('j1', 'completed')
    expect(useScan2TextStore.getState().jobs['j1'].status).toBe('completed')
  })
})
