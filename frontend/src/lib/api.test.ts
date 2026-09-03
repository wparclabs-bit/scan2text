import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { uploadFile, getTaskStatus, isTaskCompleted, isTaskFailed, defaultDelay } from './api'
import { buildApiUrl } from './apiBase'

describe('uploadFile', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  it('should return task_id from successful POST', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 202,
      json: () => Promise.resolve({ task_id: 'abc-123' }),
    })

    const filePaths = ["C:/Users/Test/file1.png", "D:/Pictures/photo.jpg"]
    const result = await uploadFile(filePaths)

    expect(result).toEqual({ task_id: 'abc-123' })
  })

  it('should POST JSON payload to /process with file_paths array', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 202,
      json: () => Promise.resolve({ task_id: 't1' }),
    })

    const filePaths = ["C:/Users/Test/file.pdf"]
    await uploadFile(filePaths)

    expect(mockFetch).toHaveBeenCalledWith(
      buildApiUrl('/process'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_paths: filePaths }),
      })
    )
  })

  it('should include enhance=true in JSON payload when enhance is true', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 202,
      json: () => Promise.resolve({ task_id: 't1' }),
    })

    const filePaths = ["C:/Users/Test/file.png"]
    await uploadFile(filePaths, true)

    expect(mockFetch).toHaveBeenCalledWith(
      buildApiUrl('/process'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ file_paths: filePaths, enhance: true }),
      })
    )
  })

  it('should NOT include enhance in JSON payload when enhance is false', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 202,
      json: () => Promise.resolve({ task_id: 't1' }),
    })

    const filePaths = ["C:/Users/Test/file.png"]
    await uploadFile(filePaths, false)

    expect(mockFetch.mock.calls[0][1].body).toContain('"file_paths"')
    expect(mockFetch.mock.calls[0][1].body).not.toContain('"enhance"')
  })

  it('should throw on 4xx response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
    })

    const filePaths = ["C:/Users/Test/file.png"]
    await expect(uploadFile(filePaths)).rejects.toThrow('Upload failed: 400 Bad Request')
  })

  it('should throw on 5xx response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    const filePaths = ["C:/Users/Test/file.png"]
    await expect(uploadFile(filePaths)).rejects.toThrow('Upload failed: 500 Internal Server Error')
  })

  it('should throw a clean error when response is 202 but body is not valid JSON', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 202,
      json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
    })

    const filePaths = ["C:/Users/Test/file.png"]
    await expect(uploadFile(filePaths)).rejects.toThrow('Server communication error')
  })

  it('should NOT include enhance in payload when enhance is omitted (default)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 202,
      json: () => Promise.resolve({ task_id: 't1' }),
    })

    const filePaths = ["C:/Users/Test/file.png"]
    await uploadFile(filePaths)

    expect(mockFetch.mock.calls[0][1].body).not.toContain('"enhance"')
  })
})

describe('getTaskStatus', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
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

    const filePaths = ["C:/Users/Test/file.pdf"]
    await uploadFile(filePaths)

    expect(mockFetch).toHaveBeenCalledWith(
      buildApiUrl('/process'),
      expect.objectContaining({ method: 'POST' })
    )
  })
})

describe('getTaskStatus - prod URL', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
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