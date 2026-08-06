import { describe, it, expect, beforeEach } from 'vitest'
import { getTestStore } from './fileStore'

function createStore() {
  const store = getTestStore()
  store.setState({ files: [] })
  return store
}

describe('fileStore', () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    store = createStore()
  })

  describe('addOptimisticFiles', () => {
    it('should add files with queued status and progress 0', () => {
      const ids = store.getState().addOptimisticFiles(['scan.pdf'])
      const files = store.getState().files
      expect(files).toHaveLength(1)
      expect(files[0].name).toBe('scan.pdf')
      expect(files[0].status).toBe('queued')
      expect(files[0].progress).toBe(0)
      expect(ids).toHaveLength(1)
      expect(ids[0]).toBe(files[0].id)
    })

    it('should generate unique ids for each file', () => {
      const ids = store.getState().addOptimisticFiles(['file1.pdf', 'file2.pdf'])
      const files = store.getState().files
      expect(files[0].id).not.toBe(files[1].id)
      expect(ids[0]).toBe(files[0].id)
      expect(ids[1]).toBe(files[1].id)
    })

    it('should set real_job_id to null initially', () => {
      store.getState().addOptimisticFiles(['scan.pdf'])
      const file = store.getState().files[0]
      expect(file.real_job_id).toBeNull()
    })
  })

  describe('assignTaskId', () => {
    it('should assign task_id and set status to processing', () => {
      const ids = store.getState().addOptimisticFiles(['scan.pdf'])
      store.getState().assignTaskId(ids, 'task-abc')
      expect(store.getState().files[0].real_job_id).toBe('task-abc')
      expect(store.getState().files[0].status).toBe('processing')
    })

    it('should not affect other files', () => {
      store.getState().addOptimisticFiles(['file1.pdf', 'file2.pdf'])
      store.getState().assignTaskId([store.getState().files[0].id], 'task-abc')
      expect(store.getState().files[0].status).toBe('processing')
      expect(store.getState().files[1].status).toBe('queued')
    })
  })

  describe('updateFileError', () => {
    it('should set status to failed and store error message', () => {
      store.getState().addOptimisticFiles(['scan.pdf'])
      const id = store.getState().files[0].id
      store.getState().updateFileError(id, 'Network error')
      expect(store.getState().files[0].status).toBe('failed')
      expect(store.getState().files[0].error).toBe('Network error')
    })
  })

  describe('updateFileStatus', () => {
    it('should update status to processing', () => {
      const { addOptimisticFiles, updateFileStatus } = store.getState()
      addOptimisticFiles(['scan.pdf'])
      const id = store.getState().files[0].id
      updateFileStatus(id, 'processing')
      expect(store.getState().files[0].status).toBe('processing')
    })

    it('should update status to completed and set real_job_id', () => {
      const { addOptimisticFiles, updateFileStatus } = store.getState()
      addOptimisticFiles(['scan.pdf'])
      const id = store.getState().files[0].id
      updateFileStatus(id, 'completed', 'job-123')
      expect(store.getState().files[0].status).toBe('completed')
      expect(store.getState().files[0].real_job_id).toBe('job-123')
    })

    it('should update status to failed', () => {
      const { addOptimisticFiles, updateFileStatus } = store.getState()
      addOptimisticFiles(['scan.pdf'])
      const id = store.getState().files[0].id
      updateFileStatus(id, 'failed')
      expect(store.getState().files[0].status).toBe('failed')
    })

    it('should not affect other files', () => {
      const { addOptimisticFiles, updateFileStatus } = store.getState()
      addOptimisticFiles(['file1.pdf'])
      addOptimisticFiles(['file2.pdf'])
      const id1 = store.getState().files[0].id
      updateFileStatus(id1, 'completed')
      expect(store.getState().files[1].status).toBe('queued')
    })
  })

  describe('updateFileProgress', () => {
    it('should update progress to a given percentage', () => {
      const { addOptimisticFiles, updateFileProgress } = store.getState()
      addOptimisticFiles(['scan.pdf'])
      const id = store.getState().files[0].id
      updateFileProgress(id, 50)
      expect(store.getState().files[0].progress).toBe(50)
    })

    it('should clamp progress between 0 and 100', () => {
      const { addOptimisticFiles, updateFileProgress } = store.getState()
      addOptimisticFiles(['scan.pdf'])
      const id = store.getState().files[0].id
      updateFileProgress(id, 150)
      expect(store.getState().files[0].progress).toBe(100)
      updateFileProgress(id, -10)
      expect(store.getState().files[0].progress).toBe(0)
    })

    it('should not affect other files progress', () => {
      const { addOptimisticFiles, updateFileProgress } = store.getState()
      addOptimisticFiles(['file1.pdf'])
      addOptimisticFiles(['file2.pdf'])
      const id1 = store.getState().files[0].id
      updateFileProgress(id1, 75)
      expect(store.getState().files[1].progress).toBe(0)
    })
  })

  describe('initial state', () => {
    it('should start with an empty files array', () => {
      expect(store.getState().files).toEqual([])
    })
  })
})
