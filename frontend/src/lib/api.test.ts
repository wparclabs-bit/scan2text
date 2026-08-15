import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { uploadFile, getTaskStatus, isTaskCompleted, isTaskFailed, pollTaskStatus, defaultDelay } from './api'
import { setDemoMode } from './demoMode'
import { buildApiUrl } from './apiBase'

describe('uploadFile', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setDemoMode(false)
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  it('should return task_id from successful POST', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 202,
      json: () => Promise.resolve({ task_id: 'abc-123' }),
    })

    const file = new File(['content'], 'doc.png', { type: 'image/png' })
    const result = await uploadFile(file)

    expect(result).toEqual({ task_id: 'abc-123' })
  })

  it('should throw on 4xx response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
    })

    const file = new File(['x'], 'test.png')
    await expect(uploadFile(file)).rejects.toThrow('Upload failed: 400 Bad Request')
  })

  it('should throw on 5xx response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    const file = new File(['x'], 'test.png')
    await expect(uploadFile(file)).rejects.toThrow('Upload failed: 500 Internal Server Error')
  })

  it('should POST multipart/form-data to /process with key "files"', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 202,
      json: () => Promise.resolve({ task_id: 't1' }),
    })

    const file = new File(['data'], 'scan.pdf', { type: 'application/pdf' })
    await uploadFile(file)

    expect(mockFetch).toHaveBeenCalledWith(
      buildApiUrl('/process'),
      expect.objectContaining({ method: 'POST' })
    )

    const init = mockFetch.mock.calls[0][1] as RequestInit
    expect(init.body).toBeInstanceOf(FormData)

    const body = init.body as FormData
    expect(body.getAll('files').length).toBe(1)
    expect((body.get('files') as File).name).toBe(file.name)
  })
})

describe('getTaskStatus', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setDemoMode(false)
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  it('should return parsed JSON body on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ task_id: 'abc123', status: 'completed', result_markdown: '# Hello' }),
    })

    const result = await getTaskStatus('abc123')

    expect(result).toEqual({ task_id: 'abc123', status: 'completed', result_markdown: '# Hello' })
  })

  it('should call fetch with correct URL /status/{taskId}', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ task_id: 't1', status: 'processing' }),
    })

    await getTaskStatus('t1')

    expect(mockFetch).toHaveBeenCalledWith(buildApiUrl('/status/t1'))
  })

  it('should encode taskId safely', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ task_id: 'x', status: 'ok' }),
    })

    await getTaskStatus('a b/c+d')

    expect(mockFetch).toHaveBeenCalledWith(buildApiUrl('/status/a%20b%2Fc%2Bd'))
  })

  it('should throw Error with message starting "Status check failed:" on non-2xx', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    })

    await expect(getTaskStatus('missing')).rejects.toThrow('Status check failed: 404 Not Found')
  })
})

describe('isTaskCompleted', () => {
  it('returns true when status is completed and result_markdown is a string', () => {
    const response = { task_id: 'abc123', status: 'completed', result_markdown: '# Hello' }
    expect(isTaskCompleted(response)).toBe(true)
  })

  it('returns false when status is not completed', () => {
    const response = { task_id: 'abc123', status: 'processing' }
    expect(isTaskCompleted(response)).toBe(false)
  })

  it('returns false when result_markdown is missing', () => {
    const response = { task_id: 'abc123', status: 'completed' }
    expect(isTaskCompleted(response)).toBe(false)
  })

  it('returns false when result_markdown is not a string', () => {
    const response = { task_id: 'abc123', status: 'completed', result_markdown: 42 as unknown as string }
    expect(isTaskCompleted(response)).toBe(false)
  })
})

describe('isTaskFailed', () => {
  it('returns true when status is "failed"', () => {
    const response = { task_id: 'abc123', status: 'failed' }
    expect(isTaskFailed(response)).toBe(true)
  })

  it('returns true when status is "failed" and error is present', () => {
    const response = { task_id: 'abc123', status: 'failed', error: 'OCR failed' }
    expect(isTaskFailed(response)).toBe(true)
  })

  it('returns false when status is not "failed"', () => {
    const response = { task_id: 'abc123', status: 'processing' }
    expect(isTaskFailed(response)).toBe(false)
  })

  it('returns false when status is missing or empty', () => {
    expect(isTaskFailed({ task_id: 'abc123', status: '' })).toBe(false)
    expect(isTaskFailed({ task_id: 'abc123', status: 'completed' })).toBe(false)
  })
})

describe('defaultDelay', () => {
  it('resolves after the given number of milliseconds', async () => {
    const start = Date.now()
    await defaultDelay(10)
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(10)
  })
})

describe('uploadFile - prod URL', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setDemoMode(false)
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
    vi.stubEnv('PROD', true)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should POST to buildApiUrl(/process) in prod mode', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 202,
      json: () => Promise.resolve({ task_id: 't1' }),
    })

    const file = new File(['data'], 'scan.pdf', { type: 'application/pdf' })
    await uploadFile(file)

    expect(mockFetch).toHaveBeenCalledWith(
      buildApiUrl('/process'),
      expect.objectContaining({ method: 'POST' })
    )
  })
})

describe('getTaskStatus - prod URL', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setDemoMode(false)
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
    vi.stubEnv('PROD', true)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should call buildApiUrl(/status/{taskId}) in prod mode', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ task_id: 't1', status: 'processing' }),
    })

    await getTaskStatus('t1')

    expect(mockFetch).toHaveBeenCalledWith(buildApiUrl('/status/t1'))
  })
})

describe('pollTaskStatus', () => {
  it('returns immediately if completed on the first attempt (delay is not called)', async () => {
    const mockGetStatus = vi.fn().mockResolvedValue({ task_id: 't1', status: 'completed', result_markdown: '# Done' })
    const mockDelay = vi.fn().mockResolvedValue(undefined)

    const deps = { getStatus: mockGetStatus, delay: mockDelay }
    const options = { maxAttempts: 5, intervalMs: 100 }

    const result = await pollTaskStatus('t1', options, deps)

    expect(result).toEqual({ task_id: 't1', status: 'completed', result_markdown: '# Done' })
    expect(mockGetStatus).toHaveBeenCalledTimes(1)
    expect(mockDelay).not.toHaveBeenCalled()
  })

  it('returns immediately if failed on the first attempt', async () => {
    const mockGetStatus = vi.fn().mockResolvedValue({ task_id: 't1', status: 'failed', error: 'OCR error' })
    const mockDelay = vi.fn().mockResolvedValue(undefined)

    const deps = { getStatus: mockGetStatus, delay: mockDelay }
    const options = { maxAttempts: 5, intervalMs: 100 }

    const result = await pollTaskStatus('t1', options, deps)

    expect(result).toEqual({ task_id: 't1', status: 'failed', error: 'OCR error' })
    expect(mockGetStatus).toHaveBeenCalledTimes(1)
    expect(mockDelay).not.toHaveBeenCalled()
  })

  it('polls multiple times and returns completed when reached on the 3rd attempt (verify delay was called twice)', async () => {
    const mockGetStatus = vi.fn()
      .mockResolvedValueOnce({ task_id: 't1', status: 'processing' })
      .mockResolvedValueOnce({ task_id: 't1', status: 'processing' })
      .mockResolvedValueOnce({ task_id: 't1', status: 'completed', result_markdown: '# Result' })
    const mockDelay = vi.fn().mockResolvedValue(undefined)

    const deps = { getStatus: mockGetStatus, delay: mockDelay }
    const options = { maxAttempts: 5, intervalMs: 100 }

    const result = await pollTaskStatus('t1', options, deps)

    expect(result).toEqual({ task_id: 't1', status: 'completed', result_markdown: '# Result' })
    expect(mockGetStatus).toHaveBeenCalledTimes(3)
    expect(mockDelay).toHaveBeenCalledTimes(2)
    expect(mockDelay).toHaveBeenCalledWith(100)
  })

  it('throws Error("Polling timeout: max attempts reached") if maxAttempts is reached without completion/failure', async () => {
    const mockGetStatus = vi.fn().mockResolvedValue({ task_id: 't1', status: 'processing' })
    const mockDelay = vi.fn().mockResolvedValue(undefined)

    const deps = { getStatus: mockGetStatus, delay: mockDelay }
    const options = { maxAttempts: 3, intervalMs: 100 }

    await expect(pollTaskStatus('t1', options, deps)).rejects.toThrow('Polling timeout: max attempts reached')
    expect(mockGetStatus).toHaveBeenCalledTimes(3)
    expect(mockDelay).toHaveBeenCalledTimes(2)
  })
})
