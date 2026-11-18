import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import {
  uploadFile,
  getTaskStatus,
  getHealth,
  isTaskCompleted,
  isTaskFailed,
  isTaskWaiting,
  isTaskCancelled,
  defaultDelay,
  pollTaskStatus,
  getSettings,
  cancelTask,
} from '../lib/api'
import { startProgress, stopProgress } from '../lib/progressManager'
import { canCancelJob } from '../lib/jobCancellation'
import { useConsentStore } from './consent.store'
import { i18n } from '../i18n'
import { toast } from 'sonner'

const DEFAULT_POLL_OPTIONS = { maxAttempts: 30, intervalMs: 1000 }

/** D-21: one document has a thirty-minute ceiling, then it parks with retry. */
export const DOCUMENT_CEILING_MS = 30 * 60 * 1000

export function isDocumentCeilingReached(startedAt: number, now: number): boolean {
  return now - startedAt >= DOCUMENT_CEILING_MS
}

const PROVIDER_FAILURE_TOASTS: Record<string, string> = {
  PROVIDER_UNAUTHORIZED: 'errors.providerUnauthorized',
  PROVIDER_FORBIDDEN: 'errors.providerForbidden',
  PROVIDER_QUOTA_EXHAUSTED: 'errors.providerQuota',
}

/** A fast-fail shows a specific message and a way to fix the key (D-20). */
function notifyProviderFailure(errorCode?: string, fixKey?: boolean): void {
  const key = errorCode ? PROVIDER_FAILURE_TOASTS[errorCode] : undefined
  if (key) {
    toast.error(i18n.t(key))
    if (fixKey) toast.info(i18n.t('errors.fixApiKey'))
  }
}

/** Write markdown content to disk via the Rust output_writer command. */
async function writeOutputFile(
  content: string,
  sourceFilename: string,
  outputDir: string,
): Promise<void> {
  try {
    const now = new Date()
    await invoke('write_output_file', {
      input: {
        content,
        source_filename: sourceFilename,
        output_dir: outputDir,
        completion_date: now.toISOString(),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    toast.error(i18n.t('errors.outputWriteFailed'))
    throw new Error(`Failed to write output file: ${message}`)
  }
}

export type JobStatus =
  | 'pending'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'waiting'
  | 'cancelled'

export interface ScanJob {
  id: string
  fileName: string
  fileSize: number
  /** Absolute path of the source file when the job came from metadata (T04). */
  filePath?: string
  /** File size read from Rust metadata when no real File object is available (T04). */
  metaSize?: number
  /** The engine that produced this job: 'cloud' or 'local' (T04). */
  engine?: 'local' | 'cloud'
  /** The Cloud model that produced this job's Markdown (T04). */
  cloudModelId?: string
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
  /** Short reason key for a parked job; rendered as a sentence by the queue (D-33). */
  reason?: string | null
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
    /** Absolute file path for metadata-only jobs (no real File object). */
    filePath?: string
    /** File size from Rust metadata when no real File is available. */
    metaSize?: number
    /** The engine that will produce this job's Markdown (T04). */
    engine?: 'local' | 'cloud'
    /** The Cloud model that will produce this job's Markdown (T04). */
    cloudModelId?: string
  }) => void
  updateJob: (id: string, patch: Partial<Omit<ScanJob, 'id'>>) => void
  setTaskId: (id: string, taskId: string) => void
  setStatus: (id: string, status: JobStatus) => void
  markBackground: (id: string) => void
  setActiveJob: (id: string | null) => void
  setSelectedJobId: (id: string | null) => void
  removeJob: (id: string) => void
  retryJob: (id: string) => Promise<string>
  /** Park a job in the waiting state with a short reason and a retry action (D-34). */
  parkJob: (id: string, reason: string, errorCode: string) => void
  /**
   * Cancel a running cloud job (D-22): the local wait stops at once, the
   * result is discarded, and the upstream request is abandoned best-effort.
   */
  cancelJob: (id: string) => Promise<string>
  /** Record a cancellation the backend already confirmed (D-22). */
  markCancelled: (id: string) => void
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
    filePath: undefined,
    metaSize: undefined,
    engine: undefined,
    cloudModelId: undefined,
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
    reason: null,
  }
}

// A parked job frees the single active slot, so the next FIFO job can run.
const TERMINAL_STATUSES: JobStatus[] = ['completed', 'failed', 'waiting', 'cancelled']
// Waiting is not a hard terminal: a retry resumes the same job (D-20).
// A cancelled job is final: nothing revives it (D-22).
const HARD_TERMINAL_STATUSES: JobStatus[] = ['completed', 'failed', 'cancelled']
// The polling loop stops on every terminal state, including a cancellation.
const POLL_STOP_STATUSES: JobStatus[] = ['completed', 'failed', 'waiting', 'cancelled']

function isValidTransition(current: JobStatus): boolean {
  return !HARD_TERMINAL_STATUSES.includes(current)
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
    // One state update carries every declared fact of the job.
    set((state) => ({
      jobs: {
        ...state.jobs,
        [input.id]: {
          ...createDefaultJob(
            input.id,
            input.fileName,
            input.fileSize ?? input.metaSize ?? 0,
            input.fileType ?? 'application/octet-stream',
            input.createdAt ?? Date.now(),
          ),
          filePath: input.filePath,
          metaSize: input.metaSize,
          engine: input.engine,
          cloudModelId: input.cloudModelId,
        },
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
      if (nextJob) {
        // Prefer real File object; fall back to synthetic file from metadata for path-based jobs
        const uploadFile: File = nextJob.file ?? new globalThis.File(
          [],
          nextJob.fileName,
          { type: nextJob.fileType || 'application/octet-stream' },
        ) as any
        ;(uploadFile as any).path = nextJob.filePath
        get().startUpload({
          file: uploadFile,
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
    // Find the next non-terminal job in FIFO order, preferring those already uploaded
    const nextJobId = state.jobOrder.find((jid) => {
      const j = state.jobs[jid]
      return j && !TERMINAL_STATUSES.includes(j.status)
    })
    if (nextJobId) {
      const nextJob = state.jobs[nextJobId]
      if (nextJob) {
        if (nextJob.taskId !== null) {
          // Already uploaded — just promote to processing and start polling
          set((state) => ({
            jobs: {
              ...state.jobs,
              [nextJobId]: { ...nextJob, status: 'processing' },
            },
            activeJobId: nextJobId,
          }))
          get().startPolling({ jobId: nextJobId })
        } else {
          // Not yet uploaded — start upload via startUpload (handles synthetic file for path-based jobs)
          const uploadFile: File = nextJob.file ?? new globalThis.File(
            [],
            nextJob.fileName,
            { type: nextJob.fileType || 'application/octet-stream' },
          ) as any
          ;(uploadFile as any).path = nextJob.filePath
          get().startUpload({ file: uploadFile, jobId: nextJobId })
        }
      }
    }
  },

  retryJob: async (id) => {
    const job = get().jobs[id]
    if (!job) return id

    if (job.status === 'waiting') {
      // A parked job resumes in place: same id, no second job is created.
      const file = job.file ?? new globalThis.File(
        [],
        job.fileName,
        { type: job.fileType || 'application/octet-stream' },
      ) as globalThis.File
      ;(file as any).path = job.filePath
      set((state) => {
        const current = state.jobs[id]
        if (!current) return state
        return {
          jobs: {
            ...state.jobs,
            [id]: {
              ...current,
              status: 'uploading',
              reason: null,
              errorCode: null,
              error: null,
              taskId: null,
            },
          },
        }
      })
      return get().startUpload({ file, jobId: id })
    }

    if (!job.file) return id
    const newId =
      globalThis.crypto?.randomUUID?.() ??
      `job-${Date.now()}-${Math.random().toString(36).slice(2)}`
    get().removeJob(id)
    return get().startUpload({
      file: job.file,
      jobId: newId,
    })
  },

  parkJob: (id, reason, errorCode) => {
    set((state) => {
      const job = state.jobs[id]
      if (!job) return state
      stopProgress(id)
      return {
        jobs: {
          ...state.jobs,
          [id]: { ...job, status: 'waiting', reason, errorCode },
        },
      }
    })
    get().promoteNextPending()
  },

  cancelJob: async (id) => {
    const job = get().jobs[id]
    if (!job || !canCancelJob(job)) return id
    const taskId = job.taskId

    get().markCancelled(id)

    // The cost warning is honest: the provider may still finish and charge.
    toast.warning(i18n.t('queue.cancel.toast'))

    if (taskId) {
      // Best effort: the backend stops the work and abandons the request.
      void cancelTask(taskId).catch(() => undefined)
    }
    return id
  },

  markCancelled: (id) => {
    set((state) => {
      const current = state.jobs[id]
      if (!current) return state
      stopProgress(id)
      return {
        jobs: {
          ...state.jobs,
          // D-22: the local wait stops at once and the result is discarded.
          [id]: {
            ...current,
            status: 'cancelled',
            resultMarkdown: null,
            markdownOutput: '',
            reason: null,
            error: null,
            errorCode: null,
          },
        },
        activeJobId: state.activeJobId === id ? null : state.activeJobId,
      }
    })
    get().promoteNextPending()
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

    set((state) => {
      const existingJob = state.jobs[id]
      return {
        jobs: {
          ...state.jobs,
          [id]: {
            ...createDefaultJob(
              id,
              input.file.name,
              existingJob?.fileSize ?? input.file.size,
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
      }
    })

    try {
      // In Tauri, File objects have a .path property with the absolute path
      const filePath = (input.file as any).path as string
      // T03's gate is the only source of this flag: without it the backend
      // refuses to send a Cloud-routed file.
      const cloudConsent = useConsentStore.getState().canUseCloud(id)
      const response = await uploadFile([filePath], get().enhance, cloudConsent)
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
        if (job.status === 'cancelled') {
          // D-22: a cancelled job stays cancelled; the upload error is moot.
          return state
        }
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
      if (j.status === 'cancelled') {
        // D-22: a cancelled job is never revived by a late answer.
        return
      }
      if (isTaskCancelled(response)) {
        // The backend stopped this job; the local state follows.
        get().markCancelled(input.jobId)
        return
      }
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
              engine: response.engine ?? j.engine,
              cloudModelId: response.cloud_model_id ?? j.cloudModelId,
            },
          },
          selectedJobId: input.jobId,
        })
        get().promoteNextPending()
        // Write output file via Rust command (fire-and-forget, non-blocking)
        const settings = await getSettings().catch(() => ({ output_dir: '' }))
        void writeOutputFile(md, j.fileName, settings.output_dir ?? '').catch(() => {
          // Write failure is non-fatal; job is already marked completed
        })
        return
      }
      if (isTaskFailed(response)) {
        const errorCode = response.error_code
        notifyProviderFailure(errorCode, response.fix_key)
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
      if (isTaskWaiting(response)) {
        get().parkJob(
          input.jobId,
          response.reason || 'unknown',
          response.error_code || 'UNKNOWN_ERROR',
        )
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
        if (!currentJob || !currentJob.taskId || POLL_STOP_STATUSES.includes(currentJob.status)) {
          return
        }

        // D-21: a document past the ceiling parks with a retry button instead
        // of polling for ever.
        if (isDocumentCeilingReached(startTime, Date.now())) {
          get().parkJob(input.jobId, 'ceiling', 'DOCUMENT_TIMEOUT')
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
            // Write output file via Rust command (fire-and-forget, non-blocking)
            const settings = await getSettings().catch(() => ({ output_dir: '' }))
            void writeOutputFile(md, j.fileName, settings.output_dir ?? '').catch(() => {
              // Write failure is non-fatal; job is already marked completed
            })
            return
          }
          if (isTaskFailed(statusResponse)) {
            const errorCode = statusResponse.error_code
            notifyProviderFailure(errorCode, statusResponse.fix_key)
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
          if (isTaskWaiting(statusResponse)) {
            get().parkJob(
              input.jobId,
              statusResponse.reason || 'unknown',
              statusResponse.error_code || 'UNKNOWN_ERROR',
            )
            return
          }
          if (isTaskCancelled(statusResponse)) {
            // D-22: the backend stopped this job; the local state follows.
            get().markCancelled(input.jobId)
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
