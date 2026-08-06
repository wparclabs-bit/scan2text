import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadFiles } from './uploadService'

describe('uploadFiles', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  it('should send POST to /process with multipart/form-data', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 202,
      json: () => Promise.resolve({ task_id: 'abc-123' }),
    })

    const file1 = new File(['content1'], 'doc1.png', { type: 'image/png' })
    const file2 = new File(['content2'], 'doc2.pdf', { type: 'application/pdf' })

    await uploadFiles([file1, file2])

    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/process',
      expect.objectContaining({ method: 'POST' })
    )

    const init = mockFetch.mock.calls[0][1] as RequestInit
    expect(init.body).toBeInstanceOf(FormData)
  })

  it('should return task_id from response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 202,
      json: () => Promise.resolve({ task_id: 'task-xyz' }),
    })

    const result = await uploadFiles([new File(['x'], 'test.png')])
    expect(result).toEqual({ task_id: 'task-xyz' })
  })

  it('should throw on non-OK response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
    })

    await expect(uploadFiles([new File(['x'], 'test.png')]))
      .rejects.toThrow('Upload failed: 400')
  })

  it('should append each file under the "files" key', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 202,
      json: () => Promise.resolve({ task_id: 't1' }),
    })

    const file1 = new File(['a'], 'a.png')
    const file2 = new File(['b'], 'b.pdf')
    await uploadFiles([file1, file2])

    const body = mockFetch.mock.calls[0][1].body as FormData
    const entries = Array.from(body.entries())
    expect(entries.length).toBe(2)
    expect(entries[0][0]).toBe('files')
    expect(entries[0][1]).toBe(file1)
    expect(entries[1][0]).toBe('files')
    expect(entries[1][1]).toBe(file2)
  })
})
