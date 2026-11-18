import { mirrorRoute } from './cloudRouting'

/**
 * The job states a user can still stop (D-22).
 *
 * A queued job has not started yet and a finished job cannot be changed, so
 * only a running job can be cancelled.
 */
export const CANCELLABLE_STATUSES = ['uploading', 'processing'] as const

/** The facts the cancel affordance needs; a structural type, not the store. */
export interface JobCancellationFacts {
  status?: string
  engine?: 'local' | 'cloud'
  fileSize?: number
  metaSize?: number
}

/**
 * True when the job runs on the Cloud engine.
 *
 * The declared engine wins; without one the route mirror decides, exactly as
 * the consent gate does before the first send.
 */
export function isCloudJob(job: JobCancellationFacts | null | undefined): boolean {
  if (!job) return false
  if (job.engine) return job.engine === 'cloud'
  const sizeBytes = job.metaSize ?? job.fileSize ?? 0
  return mirrorRoute(sizeBytes) === 'cloud'
}

/**
 * True when the user can still cancel this job (D-22).
 *
 * The local engine cannot interrupt an inference in progress, so the cancel
 * control is offered for a cloud job only.
 */
export function canCancelJob(job: JobCancellationFacts | null | undefined): boolean {
  if (!job) return false
  const statuses: readonly string[] = CANCELLABLE_STATUSES
  if (!job.status || !statuses.includes(job.status)) return false
  return isCloudJob(job)
}
