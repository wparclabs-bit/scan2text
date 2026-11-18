import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { toast } from 'sonner'
import { initI18n, i18n } from '@/i18n'
import en from '@/locales/en.json'
import id from '@/locales/id.json'
import { useScan2TextStore } from './scan2text.store'

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>()
  return {
    ...actual,
    getTaskStatus: vi.fn(),
    getHealth: vi.fn().mockResolvedValue({ status: 'ok' }),
    uploadFile: vi.fn(),
    getSettings: vi.fn().mockResolvedValue({ output_dir: '' }),
    defaultDelay: vi.fn().mockResolvedValue(undefined),
    cancelTask: vi.fn().mockResolvedValue({ task_id: 't1', status: 'cancelled', cancelled: true }),
  }
})

const { getTaskStatus, cancelTask } = await import('../lib/api')

const CLOUD_SIZE = 12 * 1024 * 1024

describe('T06 — cancelling a running cloud job', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    initI18n({ en: { translation: en }, id: { translation: id } })
    void i18n.changeLanguage('en')
    useScan2TextStore.getState().reset()
    ;(getTaskStatus as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      task_id: 't1',
      status: 'processing',
    })
  })

  afterEach(() => {
    useScan2TextStore.getState().reset()
  })

  function seedRunningJob(jobId = 'j1') {
    const store = useScan2TextStore.getState()
    store.addJob({ id: jobId, fileName: 'large.pdf', fileSize: CLOUD_SIZE, engine: 'cloud' })
    store.setTaskId(jobId, 't1')
    store.setStatus(jobId, 'processing')
    store.setActiveJob(jobId)
  }

  it('test_cancelling_a_running_cloud_job_stops_the_wait_and_frees_the_active_slot', async () => {
    seedRunningJob()

    await useScan2TextStore.getState().cancelJob('j1')

    const state = useScan2TextStore.getState()
    expect(state.jobs['j1'].status).toBe('cancelled')
    expect(state.activeJobId).not.toBe('j1')
    expect(cancelTask).toHaveBeenCalledWith('t1')
  })

  it('test_a_late_poll_does_not_revive_a_cancelled_job', async () => {
    seedRunningJob()
    await useScan2TextStore.getState().cancelJob('j1')

    ;(getTaskStatus as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      task_id: 't1',
      status: 'completed',
      result_markdown: '# late answer',
    })
    await useScan2TextStore.getState().pollJob({ jobId: 'j1' })

    const job = useScan2TextStore.getState().jobs['j1']
    expect(job.status).toBe('cancelled')
    expect(job.resultMarkdown).toBeNull()
  })

  it('test_a_cancelled_job_discards_the_partial_result', async () => {
    seedRunningJob()
    useScan2TextStore
      .getState()
      .updateJob('j1', { resultMarkdown: '# partial', markdownOutput: '# partial' })

    await useScan2TextStore.getState().cancelJob('j1')

    const job = useScan2TextStore.getState().jobs['j1']
    expect(job.resultMarkdown).toBeNull()
    expect(job.markdownOutput).toBe('')
  })

  it('test_cancelling_a_finished_job_changes_nothing', async () => {
    const store = useScan2TextStore.getState()
    store.addJob({ id: 'j1', fileName: 'large.pdf', fileSize: CLOUD_SIZE, engine: 'cloud' })
    store.setTaskId('j1', 't1')
    store.setStatus('j1', 'completed')
    store.updateJob('j1', { resultMarkdown: '# done' })

    await useScan2TextStore.getState().cancelJob('j1')

    const job = useScan2TextStore.getState().jobs['j1']
    expect(job.status).toBe('completed')
    expect(job.resultMarkdown).toBe('# done')
    expect(cancelTask).not.toHaveBeenCalled()
  })

  it('test_a_cancelled_job_is_never_parked_and_keeps_no_retry', async () => {
    seedRunningJob()

    await useScan2TextStore.getState().cancelJob('j1')

    const job = useScan2TextStore.getState().jobs['j1']
    expect(job.status).toBe('cancelled')
    expect(job.reason).toBeNull()
    expect(job.errorCode).toBeNull()
  })

  it('test_the_cancel_toast_says_the_provider_may_still_finish_and_charge', async () => {
    seedRunningJob()

    await useScan2TextStore.getState().cancelJob('j1')

    const warning = toast.warning as unknown as ReturnType<typeof vi.fn>
    expect(warning).toHaveBeenCalledTimes(1)
    const english = warning.mock.calls[0][0] as string
    expect(english).toContain('may still finish')
    expect(english).toContain('charge')

    void i18n.changeLanguage('id')
    seedRunningJob('j2')
    await useScan2TextStore.getState().cancelJob('j2')

    const indonesian = warning.mock.calls[1][0] as string
    expect(indonesian).toContain('masih menyelesaikan')
    expect(indonesian).toContain('biaya')
  })
})
