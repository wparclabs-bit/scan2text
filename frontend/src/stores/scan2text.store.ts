import { create } from 'zustand'
import {
  uploadFile,
  getTaskStatus,
  getHealth,
  isTaskCompleted,
  isTaskFailed,
  defaultDelay,
  pollTaskStatus,
} from '../lib/api'
import { startProgress, stopProgress } from '../lib/progressManager'
import { i18n } from '../i18n'
import { toast } from 'sonner'

const DEFAULT_POLL_OPTIONS = { maxAttempts: 30, intervalMs: 1000 }

export type JobStatus =
  | 'pending'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'failed'

export interface ScanJob {
  id: string
  fileName: string
  fileSize: number
  fileType: string
  taskId: string | null
  status: JobStatus
  isBackground: boolean
  createdAt: number
  resultMarkdown: string | null
  markdownOutput: string
  error: string | null
  errorCode: string | null
  file: File | null
  progress: number
  consecutiveHealthFailures: number
}

export interface Scan2TextState {
  jobs: Record<string, ScanJob>
  activeJobId: string | null
  selectedJobId: string | null
  jobOrder: string[]
  showDownloader: boolean
  /** S62: image enhancement toggle, hydrated from backend settings.json on boot. */
  enhance: boolean
  setEnhance: (value: boolean) => void
  registerJob: (id: string) => void
  addJob: (input: {
    id: string
    fileName: string
    fileSize?: number
    fileType?: string
    createdAt?: number
  }) => void
  updateJob: (id: string, patch: Partial<Omit<ScanJob, 'id'>>) => void
  setTaskId: (id: string, taskId: string) => void
  setStatus: (id: string, status: JobStatus) => void
  markBackground: (id: string) => void
  setActiveJob: (id: string | null) => void
  setSelectedJobId: (id: string | null) => void
  removeJob: (id: string) => void
  retryJob: (id: string) => Promise<string>
  reset: () => void
  setShowDownloader: (value: boolean) => void
  startUpload: (input: {
    file: File
    jobId?: string
    createdAt?: number
  }) => Promise<string>
  pollJob: (input: { jobId: string }) => Promise<void>
  startPolling: (input: { jobId: string }) => void
  startNextPendingJob: () => void
  promoteNextPending: () => void
}

const initialState = {
  jobs: {} as Record<string, ScanJob>,
  activeJobId: null as string | null,
  selectedJobId: null as string | null,
  jobOrder: [] as string[],
  showDownloader: false,
  enhance: false,
}

function createDefaultJob(
  id: string,
  fileName: string,
  fileSize: number,
  fileType: string,
  createdAt: number,
): ScanJob {
  return {
    id,
    fileName,
    fileSize,
    fileType,
    taskId: null,
    status: 'pending',
    isBackground: false,
    createdAt,
    resultMarkdown: null,
    markdownOutput: '',
    error: null,
    errorCode: null,
    file: null,
    progress: 0,
    consecutiveHealthFailures: 0,
  }
}

const TERMINAL_STATUSES: JobStatus[] = ['completed', 'failed']

function isValidTransition(current: JobStatus): boolean {
  if (TERMINAL_STATUSES.includes(current)) {
    return false
  }
  return true
}

export const useScan2TextStore = create<Scan2TextState>((set, get) => ({
  ...initialState,

  setEnhance: (value: boolean) => {
    set({ enhance: value })
  },

  registerJob: (id: string) => {
    set((state) => {
      if (state.jobOrder.includes(id)) return state
      return { jobOrder: [...state.jobOrder, id] }
    })
  },

  addJob: (input) => {
    set((state) => ({
      jobs: {
        ...state.jobs,
        [input.id]: createDefaultJob(
          input.id,
          input.fileName,
          input.fileSize ?? 0,
          input.fileType ?? 'application/octet-stream',
          input.createdAt ?? Date.now(),
        ),
      },
      jobOrder: [...state.jobOrder, input.id],
    }))
  },

  updateJob: (id, patch) => {
    set((state) => {
      const job = state.jobs[id]
      if (!job) return state
      return {
        jobs: {
          ...state.jobs,
          [id]: { ...job, ...patch },
        },
      }
    })
  },

  setTaskId: (id, taskId) => {
    set((state) => {
      const job = state.jobs[id]
      if (!job) return state
      return {
        jobs: {
          ...state.jobs,
          [id]: { ...job, taskId },
        },
      }
    })
  },

  setStatus: (id, status) => {
    set((state) => {
      const job = state.jobs[id]
      if (!job) return state
      if (!isValidTransition(job.status)) {
        return state
      }
      const updatedJob = { ...job, status }

      if (status === 'processing') {
        startProgress(id, (jobId, progress) => {
          set((s) => {
            const j = s.jobs[jobId]
            if (!j) return s
            return {
              jobs: {
                ...s.jobs,
                [jobId]: { ...j, progress },
              },
            }
          })
        })
      } else if (status === 'completed') {
        stopProgress(id)
        return {
          jobs: {
            ...state.jobs,
            [id]: { ...updatedJob, progress: 100 },
          },
          selectedJobId: id,
        }
      } else if (status === 'failed') {
        stopProgress(id)
        return {
          jobs: {
            ...state.jobs,
            [id]: updatedJob,
          },
        }
      }

      return {
        jobs: {
          ...state.jobs,
          [id]: updatedJob,
        },
      }
    })

    if (TERMINAL_STATUSES.includes(status)) {
      get().startNextPendingJob()
    }
  },

  markBackground: (id) => {
    set((state) => {
      const job = state.jobs[id]
      if (!job) return state
      return {
        jobs: {
          ...state.jobs,
          [id]: { ...job, isBackground: true },
        },
      }
    })
  },

  setActiveJob: (id) => {
    set({ activeJobId: id })
  },

  setSelectedJobId: (id) => {
    set({ selectedJobId: id })
  },

  removeJob: (id) => {
    set((state) => {
      stopProgress(id)
      const newJobs = { ...state.jobs }
      delete newJobs[id]
      return {
        jobs: newJobs,
        activeJobId: state.activeJobId === id ? null : state.activeJobId,
        selectedJobId: state.selectedJobId === id ? null : state.selectedJobId,
      }
    })
    get().startNextPendingJob()
  },

  startNextPendingJob: () => {
    const state = get()
    if (state.activeJobId) {
      const activeJob = state.jobs[state.activeJobId]
      if (activeJob && !TERMINAL_STATUSES.includes(activeJob.status)) {
        return
      }
    }
    const nextJobId = state.jobOrder.find((jid) => {
      const j = state.jobs[jid]
      return j && !TERMINAL_STATUSES.includes(j.status)
    })
    if (nextJobId) {
      const nextJob = state.jobs[nextJobId]
      if (nextJob && nextJob.file) {
        get().startUpload({
          file: nextJob.file,
          jobId: nextJobId,
        })
      }
    } else {
      set({ activeJobId: null })
    }
  },

  promoteNextPending: () => {
    const state = get()
    if (state.activeJobId) {
      const activeJob = state.jobs[state.activeJobId]
      if (activeJob && !TERMINAL_STATUSES.includes(activeJob.status)) {
        return
      }
    }
    const nextJobId = state.jobOrder.find((jid) => {
      const j = state.jobs[jid]
      return j && j.status === 'pending' && j.taskId !== null
    })
    if (nextJobId) {
      const nextJob = state.jobs[nextJobId]
      if (nextJob) {
        set((state) => ({
          jobs: {
            ...state.jobs,
            [nextJobId]: { ...nextJob, status: 'processing' },
          },
          activeJobId: nextJobId,
        }))
        get().startPolling({ jobId: nextJobId })
      }
    }
  },

  retryJob: async (id) => {
    const job = get().jobs[id]
    if (!job || !job.file) return id
    const newId =
      globalThis.crypto?.randomUUID?.() ??
      `job-${Date.now()}-${Math.random().toString(36).slice(2)}`
    get().removeJob(id)
    return get().startUpload({
      file: job.file,
      jobId: newId,
    })
  },

  reset: () => {
    Object.keys(get().jobs).forEach((id) => stopProgress(id))
    set({ ...initialState })
  },

  setShowDownloader: (value: boolean) => {
    set({ showDownloader: value })
  },

  startUpload: async (input) => {
    const id =
      input.jobId ??
      globalThis.crypto?.randomUUID?.() ??
      `job-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const state = get()
    const activeJob = state.activeJobId ? state.jobs[state.activeJobId] : null
    const shouldActivate =
      !activeJob || TERMINAL_STATUSES.includes(activeJob.status)

    set((state) => ({
      jobs: {
        ...state.jobs,
        [id]: {
          ...createDefaultJob(
            id,
            input.file.name,
            input.file.size,
            input.file.type || 'application/octet-stream',
            input.createdAt ?? Date.now(),
          ),
          taskId: null,
          status: shouldActivate ? 'uploading' : 'pending',
          isBackground: false,
          file: input.file,
        },
      },
      jobOrder: state.jobOrder.includes(id)
        ? state.jobOrder
        : [...state.jobOrder, id],
      ...(shouldActivate ? { activeJobId: id } : {}),
    }))

    try {
      const response = await uploadFile(input.file, get().enhance)
      set((state) => {
        const job = state.jobs[id]
        if (!job) return state
        return {
          jobs: {
            ...state.jobs,
            [id]: {
              ...job,
              taskId: response.task_id,
              status: shouldActivate ? 'processing' : job.status,
            },
          },
        }
      })
      if (shouldActivate) {
        get().startPolling({ jobId: id })
      }
      return id
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      set((state) => {
        const job = state.jobs[id]
        if (!job) return state
        return {
          jobs: {
            ...state.jobs,
            [id]: { ...job, status: 'failed', error: message },
          },
        }
      })
      get().promoteNextPending()
      return id
    }
  },

  pollJob: async (input) => {
    const job = get().jobs[input.jobId]
    if (!job) return
    if (!job.taskId) {
      set((state) => {
        const j = state.jobs[input.jobId]
        if (!j) return state
        return {
          jobs: {
            ...state.jobs,
            [input.jobId]: {
              ...j,
              status: 'failed',
              error: 'Missing task ID',
            },
          },
        }
      })
      get().startNextPendingJob()
      return
    }

    try {
      const response = await pollTaskStatus(
        job.taskId,
        DEFAULT_POLL_OPTIONS,
        {
          getStatus: getTaskStatus,
          delay: defaultDelay as (ms: number) => Promise<void>,
        },
      )
      const j = get().jobs[input.jobId]
      if (!j) return
      if (isTaskCompleted(response)) {
        const md = response.result_markdown ?? ''
        set({
          jobs: {
            ...get().jobs,
            [input.jobId]: {
              ...j,
              status: 'completed',
              resultMarkdown: md,
              markdownOutput: md,
              error: null,
            },
          },
          selectedJobId: input.jobId,
        })
        get().promoteNextPending()
        return
      }
      if (isTaskFailed(response)) {
        const errorCode = response.error_code
        if (errorCode === 'PDF_TOO_COMPLEX') {
          toast.info(i18n.t('errors.pdfTooComplex'))
        } else if (errorCode === 'FILE_TOO_COMPLEX') {
          toast.info(i18n.t('errors.fileTooComplex'))
        } else if (errorCode === 'MODEL_NOT_FOUND') {
          toast.info(i18n.t('errors.modelNotFound'))
          get().setShowDownloader(true)
        }
        set({
          jobs: {
            ...get().jobs,
            [input.jobId]: {
              ...j,
              status: 'failed',
              error: response.error ?? 'Processing failed',
              errorCode: errorCode ?? null,
            },
          },
        })
        get().promoteNextPending()
        return
      }
      const newStatus =
        j.status === 'pending' || j.status === 'uploading'
          ? 'processing'
          : j.status
      set({
        jobs: {
          ...get().jobs,
          [input.jobId]: { ...j, isBackground: true, status: newStatus },
        },
      })
    } catch (err) {
      // Initial poll failure is non-fatal; background loop will retry
    }

    // Start background endurance loop without blocking pollJob
    const startTime = Date.now()
    let lastlongDocHintAt = 0

    ;(async () => {
      while (true) {
        const currentJob = get().jobs[input.jobId]
        if (!currentJob || !currentJob.taskId || currentJob.status === 'completed' || currentJob.status === 'failed') {
          return
        }

        // Check health before each status poll
        try {
          await getHealth()
          // Health OK — reset consecutive failure counter
          const current = get().jobs[input.jobId]
          if (current && current.consecutiveHealthFailures > 0) {
            set({
              jobs: {
                ...get().jobs,
                [input.jobId]: { ...current, consecutiveHealthFailures: 0 },
              },
            })
          }
        } catch (e) {
          // Increment consecutive health failure counter
          const current = get().jobs[input.jobId]
          if (!current) return
          const newCount = (current.consecutiveHealthFailures ?? 0) + 1
          set({
            jobs: {
              ...get().jobs,
              [input.jobId]: { ...current, consecutiveHealthFailures: newCount },
            },
          })
          // Only fail after 3 consecutive health probe failures
          if (newCount >= 3) {
            set((state) => {
              const j = state.jobs[input.jobId]
              if (!j) return state
              return {
                jobs: {
                  ...state.jobs,
                  [input.jobId]: {
                    ...j,
                    status: 'failed',
                    error: i18n.t('errors.backendLost'),
                  },
                },
              }
            })
            toast.error(i18n.t('errors.backendLost'))
            get().promoteNextPending()
            return
          }
        }

        // Poll status
        try {
          const statusResponse = await getTaskStatus(currentJob.taskId)
          const j = get().jobs[input.jobId]
          if (!j) return
          if (isTaskCompleted(statusResponse)) {
            const md = statusResponse.result_markdown ?? ''
            set({
              jobs: {
                ...get().jobs,
                [input.jobId]: {
                  ...j,
                  status: 'completed',
                  resultMarkdown: md,
                  markdownOutput: md,
                  error: null,
                },
              },
              selectedJobId: input.jobId,
            })
            get().promoteNextPending()
            return
          }
          if (isTaskFailed(statusResponse)) {
            const errorCode = statusResponse.error_code
            if (errorCode === 'PDF_TOO_COMPLEX') {
              toast.info(i18n.t('errors.pdfTooComplex'))
            } else if (errorCode === 'FILE_TOO_COMPLEX') {
              toast.info(i18n.t('errors.fileTooComplex'))
            } else if (errorCode === 'MODEL_NOT_FOUND') {
              toast.info(i18n.t('errors.modelNotFound'))
              get().setShowDownloader(true)
            }
            set({
              jobs: {
                ...get().jobs,
                [input.jobId]: {
                  ...j,
                  status: 'failed',
                  error: statusResponse.error ?? 'Processing failed',
                  errorCode: errorCode ?? null,
                },
              },
            })
            get().promoteNextPending()
            return
          }
          // Still processing
          set({
            jobs: {
              ...get().jobs,
              [input.jobId]: { ...j, isBackground: true, status: 'processing' },
            },
          })
        } catch (e) {
          // Transient network error — continue to next iteration
        }

        // One-time long-doc hint after 5 min
        const elapsed = Date.now() - startTime
        if (elapsed - lastlongDocHintAt >= 2 * 60 * 1000) {
          lastlongDocHintAt = elapsed
          toast.info(i18n.t('queue.longDocHint'))
        }

        // Wait 60s before next check
        await new Promise(resolve => setTimeout(resolve, 60_000))
      }
    })()
  },

  startPolling: (input) => {
    get().pollJob({ jobId: input.jobId })
  },
}))

export function getTestStore() {
  return useScan2TextStore
}
