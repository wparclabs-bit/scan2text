import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getTestStore } from './scan2text.store'
import { toast } from 'sonner'
import { i18n } from '../i18n'

const mockI18nT = vi.hoisted(() => vi.fn((key: string) => key))

vi.mock('../i18n', () => ({
  i18n: {
    t: mockI18nT,
    language: 'en',
  },
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

const mockStopProgress = vi.hoisted(() => vi.fn())

vi.mock('../lib/progressManager', async () => {
  const actual = await vi.importActual<typeof import('../lib/progressManager')>('../lib/progressManager')
  return {
    ...actual,
    stopProgress: (...args: unknown[]) => {
      mockStopProgress(...args)
      const fn = (actual as Record<string, unknown>).stopProgress as (...a: unknown[]) => void
      fn?.(...args)
    },
  }
})

const mockUploadFile = vi.hoisted(() => vi.fn())
const mockGetTaskStatus = vi.hoisted(() => vi.fn())
const mockPollTaskStatus = vi.hoisted(() => vi.fn())
const mockGetHealth = vi.hoisted(() => vi.fn())

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api')
  return {
    ...actual,
    uploadFile: mockUploadFile,
    getTaskStatus: mockGetTaskStatus,
    pollTaskStatus: mockPollTaskStatus,
    getHealth: mockGetHealth,
  }
})

function createStore() {
  const store = getTestStore()
  store.setState({ jobs: {}, activeJobId: null, selectedJobId: null, jobOrder: [] })
  return store
}

describe('scan2text store', () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    store = createStore()
    mockGetHealth.mockResolvedValue({ status: 'ok' })
    mockGetTaskStatus.mockResolvedValue({ task_id: 'task-abc', status: 'processing' })
  })

  describe('initial state', () => {
    it('should start with empty jobs and no active job', () => {
      expect(store.getState().jobs).toEqual({})
      expect(store.getState().activeJobId).toBeNull()
    })
  })

  describe('addJob', () => {
    it('should add a job with pending status and default values', () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      const job = store.getState().jobs['job-1']
      expect(job).toBeDefined()
      expect(job.fileName).toBe('scan.pdf')
      expect(job.taskId).toBeNull()
      expect(job.status).toBe('pending')
      expect(job.isBackground).toBe(false)
      expect(job.resultMarkdown).toBeNull()
      expect(job.error).toBeNull()
    })

    it('should use provided createdAt when given', () => {
      const now = Date.now()
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf', createdAt: now })
      expect(store.getState().jobs['job-1'].createdAt).toBe(now)
    })

    it('should use Date.now() when createdAt is not provided', () => {
      const before = Date.now()
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      const after = Date.now()
      expect(store.getState().jobs['job-1'].createdAt).toBeGreaterThanOrEqual(before)
      expect(store.getState().jobs['job-1'].createdAt).toBeLessThanOrEqual(after)
    })
  })

  describe('updateJob', () => {
    it('should update an existing job', () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().updateJob('job-1', { status: 'processing', error: null })
      const job = store.getState().jobs['job-1']
      expect(job.status).toBe('processing')
      expect(job.error).toBeNull()
    })

    it('should do nothing for a missing job', () => {
      store.getState().updateJob('missing-job', { status: 'failed' })
      expect(store.getState().jobs).toEqual({})
    })
  })

  describe('setTaskId', () => {
    it('should update only taskId', () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setTaskId('job-1', 'task-abc')
      const job = store.getState().jobs['job-1']
      expect(job.taskId).toBe('task-abc')
      expect(job.fileName).toBe('scan.pdf')
    })

    it('should do nothing for a missing job', () => {
      store.getState().setTaskId('missing-job', 'task-abc')
      expect(store.getState().jobs).toEqual({})
    })
  })

  describe('setStatus', () => {
    it('should update only status', () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setStatus('job-1', 'completed')
      expect(store.getState().jobs['job-1'].status).toBe('completed')
    })

    it('should do nothing for a missing job', () => {
      store.getState().setStatus('missing-job', 'failed')
      expect(store.getState().jobs).toEqual({})
    })
  })

  describe('markBackground', () => {
    it('should set isBackground to true', () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().markBackground('job-1')
      expect(store.getState().jobs['job-1'].isBackground).toBe(true)
    })

    it('should do nothing for a missing job', () => {
      store.getState().markBackground('missing-job')
      expect(store.getState().jobs).toEqual({})
    })
  })

  describe('setActiveJob', () => {
    it('should update activeJobId', () => {
      store.getState().setActiveJob('job-1')
      expect(store.getState().activeJobId).toBe('job-1')
    })

    it('should set activeJobId to null', () => {
      store.getState().setActiveJob('job-1')
      store.getState().setActiveJob(null)
      expect(store.getState().activeJobId).toBeNull()
    })
  })

  describe('removeJob', () => {
    it('should remove the job', () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().removeJob('job-1')
      expect(store.getState().jobs).toEqual({})
    })

    it('should clear activeJobId when removing the active job', () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setActiveJob('job-1')
      store.getState().removeJob('job-1')
      expect(store.getState().activeJobId).toBeNull()
    })

    it('should not affect activeJobId when removing a different job', () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().addJob({ id: 'job-2', fileName: 'scan2.pdf' })
      store.getState().setActiveJob('job-1')
      store.getState().removeJob('job-2')
      expect(store.getState().activeJobId).toBe('job-1')
    })
  })

  describe('reset', () => {
    it('should restore initial state', () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setActiveJob('job-1')
      store.getState().reset()
      expect(store.getState().jobs).toEqual({})
      expect(store.getState().activeJobId).toBeNull()
    })
  })

  describe('startUpload', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should create a new job using the provided jobId', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-abc' })
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await store.getState().startUpload({ file, jobId: 'my-job-id' })
      expect(store.getState().jobs['my-job-id']).toBeDefined()
      expect(store.getState().jobs['my-job-id'].fileName).toBe('test.pdf')
    })

    it('should set the new job as active', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-abc' })
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await store.getState().startUpload({ file, jobId: 'my-job-id' })
      expect(store.getState().activeJobId).toBe('my-job-id')
    })

    it('should set status to uploading before upload completion if practical', async () => {
      let resolvePromise: (value: { task_id: string }) => void
      const pendingPromise = new Promise<{ task_id: string }>((resolve) => {
        resolvePromise = resolve
      })
      mockUploadFile.mockReturnValue(pendingPromise as ReturnType<typeof mockUploadFile>)
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const startPromise = store.getState().startUpload({ file, jobId: 'my-job-id' })
      expect(store.getState().jobs['my-job-id'].status).toBe('uploading')
      resolvePromise!({ task_id: 'task-abc' })
      await startPromise
    })

    it('should call the Phase 4 uploadFile API with the provided File', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-abc' })
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await store.getState().startUpload({ file, jobId: 'my-job-id' })
      expect(mockUploadFile).toHaveBeenCalledWith(file)
    })

    it('should store the returned task_id on successful upload', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-xyz' })
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await store.getState().startUpload({ file, jobId: 'my-job-id' })
      expect(store.getState().jobs['my-job-id'].taskId).toBe('task-xyz')
    })

    it('should change status to processing on successful upload', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-xyz' })
      mockPollTaskStatus.mockRejectedValue(new Error('Polling timeout: max attempts reached'))
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await store.getState().startUpload({ file, jobId: 'my-job-id' })
      expect(store.getState().jobs['my-job-id'].status).toBe('processing')
    })

    it('should change status to failed on failed upload', async () => {
      mockUploadFile.mockRejectedValue(new Error('Network error'))
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await store.getState().startUpload({ file, jobId: 'my-job-id' })
      expect(store.getState().jobs['my-job-id'].status).toBe('failed')
    })

    it('should store an error message on failed upload', async () => {
      mockUploadFile.mockRejectedValue(new Error('Network error'))
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await store.getState().startUpload({ file, jobId: 'my-job-id' })
      expect(store.getState().jobs['my-job-id'].error).toBe('Network error')
    })

    it('should use a fallback job ID when none is provided', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-abc' })
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const id = await store.getState().startUpload({ file })
      expect(id).toBeDefined()
      expect(typeof id).toBe('string')
      expect(store.getState().jobs[id]).toBeDefined()
    })

    it('should return the job ID', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-abc' })
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const result = await store.getState().startUpload({ file, jobId: 'my-job-id' })
      expect(result).toBe('my-job-id')
    })

    it('should use "Upload failed" as error message for non-Error rejections', async () => {
      mockUploadFile.mockRejectedValue('string error')
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await store.getState().startUpload({ file, jobId: 'my-job-id' })
      expect(store.getState().jobs['my-job-id'].error).toBe('Upload failed')
    })
  })

  describe('pollJob', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should do nothing if jobId does not exist', async () => {
      await store.getState().pollJob({ jobId: 'missing-job' })
      expect(mockGetTaskStatus).not.toHaveBeenCalled()
      expect(store.getState().jobs).toEqual({})
    })

    it('should mark job failed if job has no taskId', async () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      await store.getState().pollJob({ jobId: 'job-1' })
      expect(store.getState().jobs['job-1'].status).toBe('failed')
      expect(store.getState().jobs['job-1'].error).toBe('Missing task ID')
    })

    it('should call pollTaskStatus with the job\'s taskId', async () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setTaskId('job-1', 'task-abc')
      mockPollTaskStatus.mockResolvedValue({ task_id: 'task-abc', status: 'processing' })
      await store.getState().pollJob({ jobId: 'job-1' })
      expect(mockPollTaskStatus).toHaveBeenCalledWith('task-abc', expect.any(Object), expect.any(Object))
    })

    it('on completed response should set status to "completed"', async () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setTaskId('job-1', 'task-abc')
      mockPollTaskStatus.mockResolvedValue({ task_id: 'task-abc', status: 'completed', result_markdown: '# Done' })
      await store.getState().pollJob({ jobId: 'job-1' })
      expect(store.getState().jobs['job-1'].status).toBe('completed')
    })

    it('on completed response should store resultMarkdown', async () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setTaskId('job-1', 'task-abc')
      mockPollTaskStatus.mockResolvedValue({ task_id: 'task-abc', status: 'completed', result_markdown: '# Hello world' })
      await store.getState().pollJob({ jobId: 'job-1' })
      expect(store.getState().jobs['job-1'].resultMarkdown).toBe('# Hello world')
    })

    it('on failed response should set status to "failed"', async () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setTaskId('job-1', 'task-abc')
      mockPollTaskStatus.mockResolvedValue({ task_id: 'task-abc', status: 'failed', error: 'OCR error' })
      await store.getState().pollJob({ jobId: 'job-1' })
      expect(store.getState().jobs['job-1'].status).toBe('failed')
    })

    it('on failed response should store an error message', async () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setTaskId('job-1', 'task-abc')
      mockPollTaskStatus.mockResolvedValue({ task_id: 'task-abc', status: 'failed', error: 'OCR error' })
      await store.getState().pollJob({ jobId: 'job-1' })
      expect(store.getState().jobs['job-1'].error).toBe('OCR error')
    })

    it('on failed response with no error field should use "Processing failed"', async () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setTaskId('job-1', 'task-abc')
      mockPollTaskStatus.mockResolvedValue({ task_id: 'task-abc', status: 'failed' })
      await store.getState().pollJob({ jobId: 'job-1' })
      expect(store.getState().jobs['job-1'].error).toBe('Processing failed')
    })

    it('on PDF_TOO_COMPLEX should fire translated info toast', async () => {
      mockI18nT.mockReturnValue('PDF too complex for the current page limit. Raise the page limit in Settings and retry.')
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setTaskId('job-1', 'task-abc')
      mockPollTaskStatus.mockResolvedValue({ task_id: 'task-abc', status: 'failed', error: 'PDF_TOO_COMPLEX', error_code: 'PDF_TOO_COMPLEX' })
      await store.getState().pollJob({ jobId: 'job-1' })
      const { toast } = await import('sonner')
      expect((toast.info as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1)
      expect((toast.info as unknown as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual(['PDF too complex for the current page limit. Raise the page limit in Settings and retry.'])
    })

    it('on FILE_TOO_COMPLEX should fire translated info toast', async () => {
      mockI18nT.mockReturnValue('File too complex (max 20MB).')
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setTaskId('job-1', 'task-abc')
      mockPollTaskStatus.mockResolvedValue({ task_id: 'task-abc', status: 'failed', error: 'FILE_TOO_COMPLEX', error_code: 'FILE_TOO_COMPLEX' })
      await store.getState().pollJob({ jobId: 'job-1' })
      const { toast } = await import('sonner')
      expect((toast.info as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1)
      expect((toast.info as unknown as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual(['File too complex (max 20MB).'])
    })

    it('on other error_code should not fire a new toast', async () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setTaskId('job-1', 'task-abc')
      mockPollTaskStatus.mockResolvedValue({ task_id: 'task-abc', status: 'failed', error: 'OCR error', error_code: 'UNKNOWN_ERROR' })
      await store.getState().pollJob({ jobId: 'job-1' })
      const { toast } = await import('sonner')
      expect((toast.info as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0)
    })

    it('if polling finishes with non-final status should set isBackground to true', async () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setTaskId('job-1', 'task-abc')
      mockPollTaskStatus.mockResolvedValue({ task_id: 'task-abc', status: 'processing' })
      await store.getState().pollJob({ jobId: 'job-1' })
      expect(store.getState().jobs['job-1'].isBackground).toBe(true)
      expect(store.getState().jobs['job-1'].status).toBe('processing')
    })

    it('if pollTaskStatus rejects should not re-throw the error', async () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setTaskId('job-1', 'task-abc')
      mockPollTaskStatus.mockRejectedValue(new Error('Network down'))
      mockGetTaskStatus.mockResolvedValue({ task_id: 'task-abc', status: 'processing' })
      await expect(store.getState().pollJob({ jobId: 'job-1' })).resolves.toBeUndefined()
      expect(store.getState().jobs['job-1'].status).toBe('processing')
    })

    it('if pollTaskStatus rejects with non-Error should not re-throw the error', async () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setTaskId('job-1', 'task-abc')
      mockPollTaskStatus.mockRejectedValue('string error')
      mockGetTaskStatus.mockResolvedValue({ task_id: 'task-abc', status: 'processing' })
      await expect(store.getState().pollJob({ jobId: 'job-1' })).resolves.toBeUndefined()
      expect(store.getState().jobs['job-1'].status).toBe('processing')
    })

    it('on completed response should clear previous error', async () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setTaskId('job-1', 'task-abc')
      store.getState().updateJob('job-1', { status: 'processing', error: 'old error' })
      mockPollTaskStatus.mockResolvedValue({ task_id: 'task-abc', status: 'completed', result_markdown: '# Done' })
      await store.getState().pollJob({ jobId: 'job-1' })
      expect(store.getState().jobs['job-1'].error).toBeNull()
    })
  })

  describe('ScanJob interface fields', () => {
    it('should include fileSize as 0 in addJob default job', () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.png' })
      const job = store.getState().jobs['job-1']
      expect(job.fileSize).toBe(0)
    })

    it('should accept fileSize in addJob input', () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.png', fileSize: 12345 })
      expect(store.getState().jobs['job-1'].fileSize).toBe(12345)
    })

    it('should set fileSize in startUpload', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-abc' })
      const file = new File(['content'], 'test.png', { type: 'image/png' })
      Object.defineProperty(file, 'size', { value: 999 })
      await store.getState().startUpload({ file, jobId: 'my-job-id' })
      const job = store.getState().jobs['my-job-id']
      expect(job.fileSize).toBe(999)
    })
  })

  describe('status state machine', () => {
    it('should allow valid transition uploading → processing', () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setStatus('job-1', 'uploading')
      store.getState().setStatus('job-1', 'processing')
      expect(store.getState().jobs['job-1'].status).toBe('processing')
    })

    it('should allow valid transition processing → completed', () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setStatus('job-1', 'processing')
      store.getState().setStatus('job-1', 'completed')
      expect(store.getState().jobs['job-1'].status).toBe('completed')
    })

    it('should allow valid transition processing → failed', () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setStatus('job-1', 'processing')
      store.getState().setStatus('job-1', 'failed')
      expect(store.getState().jobs['job-1'].status).toBe('failed')
    })

    it('should reject invalid transition completed → processing', () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setStatus('job-1', 'completed')
      store.getState().setStatus('job-1', 'processing')
      expect(store.getState().jobs['job-1'].status).toBe('completed')
    })

    it('should reject invalid transition failed → completed', () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setStatus('job-1', 'failed')
      store.getState().setStatus('job-1', 'completed')
      expect(store.getState().jobs['job-1'].status).toBe('failed')
    })
  })

  describe('progress', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should start at 0 when job enters processing', () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setStatus('job-1', 'uploading')
      store.getState().setStatus('job-1', 'processing')
      expect(store.getState().jobs['job-1'].progress).toBe(0)
    })

    it('should increment progress over time during processing', async () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setStatus('job-1', 'uploading')
      store.getState().setStatus('job-1', 'processing')
      await vi.advanceTimersByTimeAsync(15_000)
      const job = store.getState().jobs['job-1']
      expect(job.progress).toBeGreaterThan(0)
      expect(job.progress).toBeLessThanOrEqual(90)
    })

    it('should not exceed 90 before completion', async () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setStatus('job-1', 'uploading')
      store.getState().setStatus('job-1', 'processing')
      await vi.advanceTimersByTimeAsync(29_999)
      expect(store.getState().jobs['job-1'].progress).toBeLessThanOrEqual(90)
    })

    it('should jump to 100 on completed', async () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setStatus('job-1', 'uploading')
      store.getState().setStatus('job-1', 'processing')
      await vi.advanceTimersByTimeAsync(1000)
      store.getState().setStatus('job-1', 'completed')
      expect(store.getState().jobs['job-1'].progress).toBe(100)
    })

    it('should stop progress on failed', async () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setStatus('job-1', 'uploading')
      store.getState().setStatus('job-1', 'processing')
      await vi.advanceTimersByTimeAsync(5000)
      const progressBeforeStop = store.getState().jobs['job-1'].progress
      store.getState().setStatus('job-1', 'failed')
      await vi.advanceTimersByTimeAsync(5000)
      const progressAfter = store.getState().jobs['job-1'].progress
      expect(progressAfter).toBe(progressBeforeStop)
    })
  })

  describe('auto-select', () => {
    it('should set selectedJobId when job completes', () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setStatus('job-1', 'processing')
      store.getState().setStatus('job-1', 'completed')
      expect(store.getState().selectedJobId).toBe('job-1')
    })

    it('should not select job when it fails', () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setStatus('job-1', 'processing')
      store.getState().setStatus('job-1', 'failed')
      expect(store.getState().selectedJobId).toBeNull()
    })

    it('should override previous selection with most recent completed job', () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan1.pdf' })
      store.getState().addJob({ id: 'job-2', fileName: 'scan2.pdf' })
      store.getState().setStatus('job-1', 'processing')
      store.getState().setStatus('job-1', 'completed')
      expect(store.getState().selectedJobId).toBe('job-1')
      store.getState().setStatus('job-2', 'processing')
      store.getState().setStatus('job-2', 'completed')
      expect(store.getState().selectedJobId).toBe('job-2')
    })

    it('should have selectedJobId in initial state as null', () => {
      expect(store.getState().selectedJobId).toBeNull()
    })
  })

  describe('startPolling', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should start polling after upload succeeds', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-abc' })
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await store.getState().startUpload({ file, jobId: 'my-job-id' })
      expect(mockPollTaskStatus).toHaveBeenCalled()
    })

    it('should stop polling when job completes', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-abc' })
      mockPollTaskStatus.mockResolvedValue({ task_id: 'task-abc', status: 'completed', result_markdown: '# Done' })
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await store.getState().startUpload({ file, jobId: 'my-job-id' })
      const callCount = mockPollTaskStatus.mock.calls.length
      await vi.advanceTimersByTimeAsync(70_000)
      expect(mockPollTaskStatus.mock.calls.length).toBe(callCount)
    })

    it('should retry after 60s on timeout', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-abc' })
      mockPollTaskStatus.mockRejectedValue(new Error('timeout'))
      mockGetTaskStatus.mockResolvedValue({ task_id: 'task-abc', status: 'processing' })
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await store.getState().startUpload({ file, jobId: 'my-job-id' })
      await vi.advanceTimersByTimeAsync(60_000)
      expect(mockGetTaskStatus.mock.calls.length).toBeGreaterThan(0)
    })

    it('should not mark job failed after max 10 retries', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-abc' })
      mockPollTaskStatus.mockRejectedValue(new Error('timeout'))
      mockGetTaskStatus.mockResolvedValue({ task_id: 'task-abc', status: 'processing' })
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await store.getState().startUpload({ file, jobId: 'my-job-id' })
      for (let i = 0; i < 10; i++) {
        await vi.advanceTimersByTimeAsync(60_000)
      }
      expect(store.getState().jobs['my-job-id'].status).toBe('processing')
    })

    it('should stop polling when job errors', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-abc' })
      mockPollTaskStatus.mockResolvedValue({ task_id: 'task-abc', status: 'failed', error: 'OCR error' })
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await store.getState().startUpload({ file, jobId: 'my-job-id' })
      const callCount = mockPollTaskStatus.mock.calls.length
      await vi.advanceTimersByTimeAsync(70_000)
      expect(mockPollTaskStatus.mock.calls.length).toBe(callCount)
    })

    it('should not mark job failed on transient network error during polling', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-abc' })
      mockPollTaskStatus.mockRejectedValue(new Error('Failed to fetch'))
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await store.getState().startUpload({ file, jobId: 'my-job-id' })
      expect(store.getState().jobs['my-job-id'].status).not.toBe('failed')
      expect(store.getState().jobs['my-job-id'].status).toBe('processing')
    })

    it('should complete job after stale timeout with background retry and set markdown', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-abc' })
      mockPollTaskStatus.mockRejectedValue(new Error('timeout'))
      mockGetTaskStatus.mockResolvedValueOnce({ task_id: 'task-abc', status: 'processing' })
      mockGetTaskStatus.mockResolvedValue({ task_id: 'task-abc', status: 'completed', result_markdown: '# Stale timeout markdown' })
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await store.getState().startUpload({ file, jobId: 'my-job-id' })
      expect(store.getState().jobs['my-job-id'].status).toBe('processing')
      await vi.advanceTimersByTimeAsync(30_000)
      expect(store.getState().jobs['my-job-id'].status).not.toBe('failed')
      expect(store.getState().jobs['my-job-id'].status).toBe('processing')
      await vi.advanceTimersByTimeAsync(60_000)
      expect(store.getState().jobs['my-job-id'].status).toBe('completed')
      expect(store.getState().jobs['my-job-id'].resultMarkdown).toBe('# Stale timeout markdown')
      expect(store.getState().jobs['my-job-id'].markdownOutput).toBe('# Stale timeout markdown')
      expect(store.getState().jobs['my-job-id'].error).toBeNull()
    })
  })

  describe('timer cleanup', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should clean up timer after job completes', async () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setStatus('job-1', 'uploading')
      store.getState().setStatus('job-1', 'processing')
      await vi.advanceTimersByTimeAsync(1000)
      store.getState().setStatus('job-1', 'completed')
      await vi.advanceTimersByTimeAsync(5000)
      expect(store.getState().jobs['job-1'].progress).toBe(100)
    })

    it('should clean up timer after job fails', async () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setStatus('job-1', 'uploading')
      store.getState().setStatus('job-1', 'processing')
      await vi.advanceTimersByTimeAsync(1000)
      store.getState().setStatus('job-1', 'failed')
      await vi.advanceTimersByTimeAsync(5000)
      expect(store.getState().jobs['job-1'].progress).toBeDefined()
    })

    it('should clean up timers on reset', async () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setStatus('job-1', 'uploading')
      store.getState().setStatus('job-1', 'processing')
      await vi.advanceTimersByTimeAsync(1000)
      store.getState().reset()
      expect(store.getState().jobs).toEqual({})
    })
  })

  describe('file and markdownOutput fields', () => {
    it('should include file in addJob default job as null', () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      const job = store.getState().jobs['job-1']
      expect(job.file).toBeNull()
      expect(job.markdownOutput).toBe('')
    })

    it('should store the File object in startUpload', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-abc' })
      const file = new File(['content'], 'test.png', { type: 'image/png' })
      await store.getState().startUpload({ file, jobId: 'my-job-id' })
      const job = store.getState().jobs['my-job-id']
      expect(job.file).toBe(file)
      expect(job.fileType).toBe('image/png')
    })

    it('should store markdownOutput on completion via polling', async () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setTaskId('job-1', 'task-abc')
      mockPollTaskStatus.mockResolvedValue({ task_id: 'task-abc', status: 'completed', result_markdown: '# Hello world' })
      await store.getState().pollJob({ jobId: 'job-1' })
      const job = store.getState().jobs['job-1']
      expect(job.resultMarkdown).toBe('# Hello world')
      expect(job.markdownOutput).toBe('# Hello world')
    })

    it('should default fileType in startUpload when file.type is empty', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-abc' })
      const file = new File(['content'], 'test.bin')
      Object.defineProperty(file, 'type', { value: '' })
      await store.getState().startUpload({ file, jobId: 'my-job-id' })
      expect(store.getState().jobs['my-job-id'].fileType).toBe('application/octet-stream')
    })
  })

  describe('removeJob cleanup', () => {
    beforeEach(() => {
      mockStopProgress.mockClear()
    })

    it('should call stopProgress on job removal (async)', async () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.png' })
      store.getState().setStatus('job-1', 'processing')
      await new Promise(resolve => setTimeout(resolve, 0))
      store.getState().removeJob('job-1')
      // Give the async cleanup time to execute
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(mockStopProgress).toHaveBeenCalledWith('job-1')
    })

    it('should stop progress timer on remove', async () => {
      vi.useFakeTimers()
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setStatus('job-1', 'uploading')
      store.getState().setStatus('job-1', 'processing')
      await vi.advanceTimersByTimeAsync(1000)
      store.getState().removeJob('job-1')
      vi.useRealTimers()
      const job = store.getState().jobs['job-1']
      expect(job).toBeUndefined()
    })
  })

  describe('retryJob', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should create a new job with the same file on retry', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-new' })
      const originalFile = new File(['content'], 'test.png', { type: 'image/png' })
      await store.getState().startUpload({ file: originalFile, jobId: 'failed-job' })
      store.getState().setStatus('failed-job', 'failed')
      const newId = await store.getState().retryJob('failed-job')
      expect(newId).toBeDefined()
      expect(store.getState().jobs[newId]).toBeDefined()
      expect(store.getState().jobs[newId].file).toBe(originalFile)
      expect(store.getState().jobs[newId].fileName).toBe('test.png')
    })

    it('should remove the failed job after retry', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-new' })
      const originalFile = new File(['content'], 'test.png', { type: 'image/png' })
      await store.getState().startUpload({ file: originalFile, jobId: 'failed-job' })
      store.getState().setStatus('failed-job', 'failed')
      await store.getState().retryJob('failed-job')
      expect(store.getState().jobs['failed-job']).toBeUndefined()
    })

    it('should do nothing if job has no file', async () => {
      store.getState().addJob({ id: 'job-1', fileName: 'scan.pdf' })
      store.getState().setStatus('job-1', 'failed')
      const result = await store.getState().retryJob('job-1')
      expect(result).toBe('job-1')
      expect(mockUploadFile).not.toHaveBeenCalled()
    })
  })

  describe('FIFO queue behavior', () => {
    beforeEach(() => {
      vi.resetAllMocks()
      mockUploadFile.mockResolvedValue({ task_id: 'task-default' })
      mockGetTaskStatus.mockResolvedValue({ task_id: '', status: 'processing' })
      mockPollTaskStatus.mockResolvedValue({ task_id: '', status: 'processing' })
    })

    it('should track jobOrder when jobs are added', () => {
      store.getState().addJob({ id: 'job-1', fileName: 'a.pdf' })
      store.getState().addJob({ id: 'job-2', fileName: 'b.pdf' })
      store.getState().addJob({ id: 'job-3', fileName: 'c.pdf' })
      expect(store.getState().jobOrder).toEqual(['job-1', 'job-2', 'job-3'])
    })

    it('should preserve insertion order in jobOrder', () => {
      store.getState().addJob({ id: 'job-c', fileName: 'c.pdf' })
      store.getState().addJob({ id: 'job-a', fileName: 'a.pdf' })
      store.getState().addJob({ id: 'job-b', fileName: 'b.pdf' })
      expect(store.getState().jobOrder).toEqual(['job-c', 'job-a', 'job-b'])
    })

    it('should start next pending job when active job completes', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-1' })
      const file1 = new File(['a'], 'first.png', { type: 'image/png' })
      const file2 = new File(['b'], 'second.png', { type: 'image/png' })

      await store.getState().startUpload({ file: file1, jobId: 'job-1' })
      expect(store.getState().activeJobId).toBe('job-1')

      mockUploadFile.mockResolvedValue({ task_id: 'task-2' })
      await store.getState().startUpload({ file: file2, jobId: 'job-2' })
      expect(store.getState().activeJobId).toBe('job-1')
      expect(store.getState().jobs['job-2'].status).toBe('pending')

      store.getState().setStatus('job-1', 'completed')
      expect(store.getState().activeJobId).toBe('job-2')
      expect(store.getState().jobs['job-2'].status).toBe('uploading')
    })

    it('should start next pending job when active job fails', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-1' })
      const file1 = new File(['a'], 'first.png', { type: 'image/png' })
      const file2 = new File(['b'], 'second.png', { type: 'image/png' })

      await store.getState().startUpload({ file: file1, jobId: 'job-1' })
      expect(store.getState().activeJobId).toBe('job-1')

      mockUploadFile.mockResolvedValue({ task_id: 'task-2' })
      await store.getState().startUpload({ file: file2, jobId: 'job-2' })
      expect(store.getState().activeJobId).toBe('job-1')

      store.getState().setStatus('job-1', 'failed')
      expect(store.getState().activeJobId).toBe('job-2')
      expect(store.getState().jobs['job-2'].status).toBe('uploading')
    })

    it('should start next pending job when active job is removed', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-1' })
      const file1 = new File(['a'], 'first.png', { type: 'image/png' })
      const file2 = new File(['b'], 'second.png', { type: 'image/png' })

      await store.getState().startUpload({ file: file1, jobId: 'job-1' })
      expect(store.getState().activeJobId).toBe('job-1')

      mockUploadFile.mockResolvedValue({ task_id: 'task-2' })
      await store.getState().startUpload({ file: file2, jobId: 'job-2' })
      expect(store.getState().activeJobId).toBe('job-1')

      store.getState().removeJob('job-1')
      expect(store.getState().activeJobId).toBe('job-2')
      expect(store.getState().jobs['job-2'].status).toBe('uploading')
    })

    it('should not start next job when no pending jobs exist', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-1' })
      const file1 = new File(['a'], 'first.png', { type: 'image/png' })

      await store.getState().startUpload({ file: file1, jobId: 'job-1' })
      store.getState().setStatus('job-1', 'completed')
      expect(store.getState().activeJobId).toBeNull()
    })

    it('should append retry job to end of queue', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-1' })
      const file1 = new File(['a'], 'first.png', { type: 'image/png' })
      const file2 = new File(['b'], 'second.png', { type: 'image/png' })

      await store.getState().startUpload({ file: file1, jobId: 'job-1' })
      mockUploadFile.mockResolvedValue({ task_id: 'task-2' })
      await store.getState().startUpload({ file: file2, jobId: 'job-2' })

      store.getState().setStatus('job-1', 'failed')
      expect(store.getState().activeJobId).toBe('job-2')

      mockUploadFile.mockResolvedValue({ task_id: 'task-retry' })
      await store.getState().retryJob('job-2')
      const retryJobId = Object.keys(store.getState().jobs).find((id) => id !== 'job-1' && id !== 'job-2')
      expect(retryJobId).toBeDefined()
      expect(store.getState().jobOrder).toContain(retryJobId!)
    })

    it('should clear jobOrder on reset', () => {
      store.getState().addJob({ id: 'job-1', fileName: 'a.pdf' })
      store.getState().addJob({ id: 'job-2', fileName: 'b.pdf' })
      store.getState().reset()
      expect(store.getState().jobOrder).toEqual([])
    })

    it('should promote pending job with taskId when active completes via pollJob', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-1' })
      const file1 = new File(['a'], 'first.png', { type: 'image/png' })
      const file2 = new File(['b'], 'second.png', { type: 'image/png' })

      await store.getState().startUpload({ file: file1, jobId: 'job-1' })
      expect(store.getState().activeJobId).toBe('job-1')
      expect(store.getState().jobs['job-1'].status).toBe('processing')

      mockUploadFile.mockResolvedValue({ task_id: 'task-2' })
      await store.getState().startUpload({ file: file2, jobId: 'job-2' })
      expect(store.getState().activeJobId).toBe('job-1')
      expect(store.getState().jobs['job-2'].status).toBe('pending')
      expect(store.getState().jobs['job-2'].taskId).toBe('task-2')

      mockPollTaskStatus
        .mockResolvedValueOnce({ task_id: 'task-1', status: 'completed', result_markdown: '# Done' })
        .mockResolvedValueOnce({ task_id: 'task-2', status: 'processing' })
      await store.getState().pollJob({ jobId: 'job-1' })

      expect(store.getState().activeJobId).toBe('job-2')
      expect(store.getState().jobs['job-2'].status).toBe('processing')
      expect(mockPollTaskStatus).toHaveBeenCalled()
    })

    it('should promote pending job with taskId when active fails via pollJob', async () => {
      mockUploadFile.mockResolvedValue({ task_id: 'task-1' })
      const file1 = new File(['a'], 'first.png', { type: 'image/png' })
      const file2 = new File(['b'], 'second.png', { type: 'image/png' })

      await store.getState().startUpload({ file: file1, jobId: 'job-1' })
      expect(store.getState().activeJobId).toBe('job-1')
      expect(store.getState().jobs['job-1'].status).toBe('processing')

      mockUploadFile.mockResolvedValue({ task_id: 'task-2' })
      await store.getState().startUpload({ file: file2, jobId: 'job-2' })
      expect(store.getState().activeJobId).toBe('job-1')
      expect(store.getState().jobs['job-2'].status).toBe('pending')
      expect(store.getState().jobs['job-2'].taskId).toBe('task-2')

      mockPollTaskStatus
        .mockResolvedValueOnce({ task_id: 'task-1', status: 'failed', error: 'OCR error' })
        .mockResolvedValueOnce({ task_id: 'task-2', status: 'processing' })
      await store.getState().pollJob({ jobId: 'job-1' })

      expect(store.getState().activeJobId).toBe('job-2')
      expect(store.getState().jobs['job-2'].status).toBe('processing')
      expect(mockPollTaskStatus).toHaveBeenCalled()
    })

    it('should promote pending job when active upload fails', async () => {
      const file1 = new File(['a'], 'first.png', { type: 'image/png' })
      mockUploadFile.mockRejectedValue(new Error('Network error'))
      await store.getState().startUpload({ file: file1, jobId: 'job-1' })
      expect(store.getState().jobs['job-1'].status).toBe('failed')

      mockUploadFile.mockResolvedValue({ task_id: 'task-2' })
      const file2 = new File(['b'], 'second.png', { type: 'image/png' })
      await store.getState().startUpload({ file: file2, jobId: 'job-2' })
      expect(store.getState().activeJobId).toBe('job-2')
      expect(store.getState().jobs['job-2'].status).toBe('processing')
    })
  })

  describe('long-doc hint', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should fire long-doc hint every 2 minutes while processing', async () => {
      mockGetHealth.mockResolvedValue({ status: 'ok' } as any)
      mockPollTaskStatus.mockResolvedValue({ task_id: 'task-1', status: 'processing' })

      store.getState().addJob({ id: 'job-1', fileName: 'long.pdf' })
      store.getState().setTaskId('job-1', 'task-1')
      store.getState().setStatus('job-1', 'processing')

      // Start polling in background
      store.getState().pollJob({ jobId: 'job-1' })

      // 2 minutes → first hint
      await vi.advanceTimersByTimeAsync(2 * 60 * 1000)
      expect(toast.info).toHaveBeenCalledTimes(1)
      expect(toast.info).toHaveBeenCalledWith(i18n.t('queue.longDocHint'))

      // 3 minutes → still only 1 call (silent)
      await vi.advanceTimersByTimeAsync(60 * 1000)
      expect(toast.info).toHaveBeenCalledTimes(1)

      // 4 minutes → second hint (repeats)
      await vi.advanceTimersByTimeAsync(60 * 1000)
      expect(toast.info).toHaveBeenCalledTimes(2)

      // 6 minutes → third hint
      await vi.advanceTimersByTimeAsync(2 * 60 * 1000)
      expect(toast.info).toHaveBeenCalledTimes(3)
    })
  })
})