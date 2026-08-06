import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('uploadFile - demo mode', () => {
  let uploadFile: (file: File) => Promise<{ task_id: string }>
  let getTaskStatus: (taskId: string) => Promise<{ task_id: string; status: string; result_markdown?: string }>

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('./api')
    uploadFile = mod.uploadFile
    getTaskStatus = mod.getTaskStatus
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return a demo task_id starting with "demo-"', async () => {
    const file = new File(['content'], 'test.png', { type: 'image/png' })
    const result = await uploadFile(file)

    expect(result.task_id).toMatch(/^demo-/)
  })

  it('should wait ~500ms before returning', async () => {
    const file = new File(['content'], 'test.png', { type: 'image/png' })
    const start = Date.now()
    await uploadFile(file)
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(400)
  })

  it('should generate rich Markdown for PDF files (includes table)', async () => {
    const pdfFile = new File(['pdf content'], 'doc.pdf', { type: 'application/pdf' })
    const { task_id } = await uploadFile(pdfFile)

    await new Promise(resolve => setTimeout(resolve, 2100))
    const status = await getTaskStatus(task_id)
    expect(status.status).toBe('completed')
    expect(status.result_markdown).toContain('|')
    expect(status.result_markdown).toContain('# ')
    expect(status.result_markdown).toContain('## ')
    expect(status.result_markdown).toContain('- ')
  })

  it('should generate simpler Markdown for image files (no table)', async () => {
    const imgFile = new File(['img content'], 'scan.png', { type: 'image/png' })
    const { task_id } = await uploadFile(imgFile)

    await new Promise(resolve => setTimeout(resolve, 2100))
    const status = await getTaskStatus(task_id)
    expect(status.status).toBe('completed')
    expect(status.result_markdown).toContain('# ')
    expect(status.result_markdown).toContain('## ')
    expect(status.result_markdown).not.toContain('|')
  })

  it('should return "processing" status before 2 seconds elapse', async () => {
    const file = new File(['content'], 'test.png', { type: 'image/png' })
    const { task_id } = await uploadFile(file)

    const status = await getTaskStatus(task_id)
    expect(status.status).toBe('processing')
  })

  it('should eventually return "completed" after polling waits', async () => {
    const file = new File(['content'], 'test.png', { type: 'image/png' })
    const { task_id } = await uploadFile(file)

    await new Promise(resolve => setTimeout(resolve, 2100))
    const status = await getTaskStatus(task_id)
    expect(status.status).toBe('completed')
    expect(typeof status.result_markdown).toBe('string')
    expect((status.result_markdown?.length ?? 0)).toBeGreaterThan(0)
  })

  it('should return processing for unknown task IDs', async () => {
    const status = await getTaskStatus('unknown-task-123')
    expect(status.status).toBe('processing')
    expect(status.task_id).toBe('unknown-task-123')
  })
})
