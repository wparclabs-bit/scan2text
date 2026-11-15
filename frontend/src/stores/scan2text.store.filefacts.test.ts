import { describe, it, expect, beforeEach } from 'vitest'
import { useScan2TextStore } from './scan2text.store'
import type { ScanJob } from './scan2text.store'

describe('ScanJob declares its file facts', () => {
  beforeEach(() => {
    useScan2TextStore.getState().reset()
  })

  it('test_job_type_declares_the_file_path_and_the_file_size', () => {
    useScan2TextStore.getState().addJob({ id: 'job-1', fileName: 'scan.png', fileSize: 2048 })

    const job: ScanJob = useScan2TextStore.getState().jobs['job-1']

    // The facts are declared on the job shape, not attached opportunistically.
    expect('filePath' in job).toBe(true)
    expect('metaSize' in job).toBe(true)
    expect(job.filePath).toBeUndefined()
    expect(job.metaSize).toBeUndefined()
  })

  it('test_add_job_stores_the_declared_file_path_and_size', () => {
    const META_SIZE = 12 * 1024 * 1024
    const emittedStates: Array<Record<string, ScanJob>> = []
    const unsubscribe = useScan2TextStore.subscribe((state) => {
      emittedStates.push(state.jobs)
    })

    useScan2TextStore.getState().addJob({
      id: 'job-2',
      fileName: 'large.pdf',
      filePath: 'C:/Users/Test/large.pdf',
      metaSize: META_SIZE,
    })
    unsubscribe()

    // addJob writes the declared facts in the same state update that creates the job.
    expect(emittedStates[0]['job-2'].filePath).toBe('C:/Users/Test/large.pdf')
    expect(emittedStates[0]['job-2'].metaSize).toBe(META_SIZE)

    const job = useScan2TextStore.getState().jobs['job-2']
    expect(job.filePath).toBe('C:/Users/Test/large.pdf')
    expect(job.metaSize).toBe(META_SIZE)
    expect(job.fileSize).toBe(META_SIZE)
  })
})
