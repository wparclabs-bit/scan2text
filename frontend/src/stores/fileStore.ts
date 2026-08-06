import { create } from 'zustand'

export type FileStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface FileEntry {
  id: string
  name: string
  status: FileStatus
  progress: number
  real_job_id: string | null
  error?: string
}

interface FileState {
  files: FileEntry[]
  addOptimisticFiles: (fileNames: string[]) => string[]
  assignTaskId: (optimisticIds: string[], task_id: string) => void
  updateFileStatus: (id: string, status: FileStatus, real_job_id?: string) => void
  updateFileProgress: (id: string, progress: number) => void
  updateFileError: (id: string, error: string) => void
}

let nextId = 1

function generateId(): string {
  return `opt-${Date.now()}-${nextId++}`
}

export const useFileStore = create<FileState>((set) => ({
  files: [],

  addOptimisticFiles: (fileNames: string[]): string[] => {
    set((state) => {
      const newIds: string[] = []
      const newFiles = fileNames.map((name) => {
        const id = generateId()
        newIds.push(id)
        return {
          id,
          name,
          status: 'queued' as FileStatus,
          progress: 0,
          real_job_id: null,
        }
      })
      return { files: [...state.files, ...newFiles] }
    })
    // Return IDs after state has been set
    const ids = fileNames.map((_, i) => {
      const files = useFileStore.getState().files
      // Find the newly added files (they are at the end)
      return files[files.length - fileNames.length + i]?.id ?? ''
    })
    return ids
  },

  assignTaskId: (optimisticIds: string[], task_id: string) => {
    set((state) => ({
      files: state.files.map((file) =>
        optimisticIds.includes(file.id)
          ? { ...file, real_job_id: task_id, status: 'processing' as FileStatus }
          : file
      ),
    }))
  },

  updateFileStatus: (id: string, status: FileStatus, real_job_id?: string) => {
    set((state) => ({
      files: state.files.map((file) =>
        file.id === id
          ? {
              ...file,
              status,
              ...(real_job_id !== undefined ? { real_job_id } : {}),
              ...(status === 'completed' ? { progress: 100 } : {}),
            }
          : file
      ),
    }))
  },

  updateFileProgress: (id: string, progress: number) => {
    const clamped = Math.min(100, Math.max(0, progress))
    set((state) => ({
      files: state.files.map((file) =>
        file.id === id ? { ...file, progress: clamped } : file
      ),
    }))
  },

  updateFileError: (id: string, error: string) => {
    set((state) => ({
      files: state.files.map((file) =>
        file.id === id
          ? { ...file, status: 'failed' as FileStatus, error }
          : file
      ),
    }))
  },
}))

export function getTestStore() {
  return useFileStore
}
