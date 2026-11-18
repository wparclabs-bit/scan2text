import { buildApiUrl } from './apiBase'

export interface UploadResponse {
  task_id: string
}

/**
 * The canonical task status set shared with the backend ``TaskStatus`` enum
 * (D-34). Both sides expose exactly these seven values; ``skipped`` is no
 * longer a backend-only value and T06 adds ``cancelled``. A test asserts the
 * two sets are equal.
 */
export const TASK_STATUSES = [
  'queued',
  'processing',
  'completed',
  'failed',
  'waiting',
  'skipped',
  'cancelled',
] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]

export interface TaskStatusResponse {
  task_id: string
  status: string
  result_markdown?: string
  error?: string
  error_code?: string
  /** Short reason key for a parked (waiting) job, never a raw status code (D-33). */
  reason?: string
  /** The engine that produced the result: 'cloud' or 'local' (T04). */
  engine?: 'local' | 'cloud'
  /** The Cloud model that produced the result (T04). */
  cloud_model_id?: string
}

export interface CompletedTaskStatusResponse {
  task_id: string
  status: 'completed'
  result_markdown: string
  error?: string
  /** The engine that produced the result: 'cloud' or 'local' (T04). */
  engine?: 'local' | 'cloud'
  /** The Cloud model that produced the result (T04). */
  cloud_model_id?: string
}

export interface FailedTaskStatusResponse {
  task_id: string
  status: 'failed'
  error?: string
  error_code?: string
  /** A key/quota fast-fail teaches the remedy instead of showing a generic error (D-20). */
  fix_key?: boolean
}

/** A parked job: waiting with a short reason key and a retryable error code (D-34). */
export interface WaitingTaskStatusResponse {
  task_id: string
  status: 'waiting'
  reason: string
  error_code?: string
}

/** A cancelled job: the local wait stopped and the result was discarded (D-22). */
export interface CancelledTaskStatusResponse {
  task_id: string
  status: 'cancelled'
}

export function isTaskCompleted(
  response: TaskStatusResponse
): response is CompletedTaskStatusResponse {
  return (
    response.status === 'completed' &&
    typeof response.result_markdown === 'string'
  )
}

export function isTaskFailed(
  response: TaskStatusResponse
): response is FailedTaskStatusResponse {
  return response.status === 'failed'
}

export function isTaskWaiting(
  response: TaskStatusResponse
): response is WaitingTaskStatusResponse {
  return response.status === 'waiting'
}

/** A cancelled task is final: the local wait stopped (D-22). */
export function isTaskCancelled(
  response: TaskStatusResponse
): response is CancelledTaskStatusResponse {
  return response.status === 'cancelled'
}

/** A terminal state stops status-driven polling (D-21). */
export function isTaskTerminal(response: TaskStatusResponse): boolean {
  return (
    isTaskCompleted(response) ||
    isTaskFailed(response) ||
    isTaskWaiting(response) ||
    isTaskCancelled(response)
  )
}

export async function getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
  const response = await fetch(buildApiUrl(`/status/${encodeURIComponent(taskId)}`))

  if (!response.ok) {
    throw new Error(`Status check failed: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<TaskStatusResponse>
}

export interface CancelTaskResponse {
  task_id: string
  status: string
  /** False when the task had already finished and nothing changed. */
  cancelled: boolean
}

/**
 * Ask the backend to cancel a running task (D-22).
 *
 * The backend stops the local wait, discards the result, and abandons the
 * upstream request best-effort. The provider may still finish the work and
 * charge for it.
 */
export async function cancelTask(taskId: string): Promise<CancelTaskResponse> {
  const response = await fetch(buildApiUrl(`/cancel/${encodeURIComponent(taskId)}`), {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Cancel failed: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<CancelTaskResponse>
}

export interface PollOptions {
  maxAttempts: number
  intervalMs: number
}

export interface PollDeps {
  getStatus: (id: string) => Promise<TaskStatusResponse>
  delay: (ms: number) => Promise<void>
}

export async function pollTaskStatus(
  taskId: string,
  options: PollOptions,
  deps: PollDeps
): Promise<TaskStatusResponse> {
  for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
    const response = await deps.getStatus(taskId)
    if (isTaskTerminal(response)) {
      return response
    }
    if (attempt < options.maxAttempts - 1) {
      await deps.delay(options.intervalMs)
    }
  }
  throw new Error('Polling timeout: max attempts reached')
}

export const defaultDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export interface SettingsResponse {
  output_dir: string
  max_pdf_pages: number
  cpu_threads: number
  enhance_image_quality?: boolean
  [key: string]: unknown
}

export interface SettingsPatch {
  output_dir?: string
  max_pdf_pages?: number
  cpu_threads?: number
  theme?: string
  language?: string
  enhance_image_quality?: boolean
}

export interface CloudRecipeResponse {
  version: string
  prompt: string
  temperature: number
  top_p: number
  thinking_enabled: boolean
}

export interface CloudCostEstimateResponse {
  prompt_tokens_per_page: number
  completion_tokens_per_page: number
  pages_per_document: number
  input_usd_per_million_tokens: number
  output_usd_per_million_tokens: number
  estimated_cost_usd: number
  measured_on: string
  basis: string
}

export interface CredentialDescriptorResponse {
  key_id: string
  last_four: string
}

export interface CloudProfileResponse {
  name: string
  beta: boolean
  enabled: boolean
  base_url: string
  model_id: string
  region: string
  recipe: CloudRecipeResponse
  cost_estimate: CloudCostEstimateResponse
  credential: CredentialDescriptorResponse | null
}

export interface CloudProfileUpdate {
  base_url: string
  model_id: string
  enabled: boolean
  api_key?: string
}

export interface CloudCapabilityResponse {
  model_id: string
  can_read_images: boolean
  latency_ms: number
  estimated_cost_usd: number
}

export async function getCloudProfile(): Promise<CloudProfileResponse> {
  const response = await fetch(buildApiUrl('/api/cloud/profile'))
  if (!response.ok) {
    throw new Error(`Cloud profile load failed: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<CloudProfileResponse>
}

export async function saveCloudProfile(update: CloudProfileUpdate): Promise<CloudProfileResponse> {
  const response = await fetch(buildApiUrl('/api/cloud/profile'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  })
  if (!response.ok) {
    throw new Error(`Cloud profile save failed: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<CloudProfileResponse>
}

export async function deleteCloudKey(): Promise<CloudProfileResponse> {
  const response = await fetch(buildApiUrl('/api/cloud/key'), { method: 'DELETE' })
  if (!response.ok) {
    throw new Error(`Cloud key delete failed: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<CloudProfileResponse>
}

export async function testCloudConnection(): Promise<CloudCapabilityResponse> {
  const response = await fetch(buildApiUrl('/api/cloud/test-connection'), { method: 'POST' })
  if (!response.ok) {
    throw new Error(`Cloud connection test failed: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<CloudCapabilityResponse>
}

export async function getSettings(): Promise<SettingsResponse> {
  const response = await fetch(buildApiUrl('/api/settings'))
  if (!response.ok) {
    throw new Error(`Settings load failed: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<SettingsResponse>
}

export async function saveSettings(patch: SettingsPatch): Promise<void> {
  const response = await fetch(buildApiUrl('/api/settings'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!response.ok) {
    throw new Error(`Settings save failed: ${response.status} ${response.statusText}`)
  }
}

export async function getHealth(): Promise<{ status: string }> {
  const response = await fetch(buildApiUrl('/api/health'))
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<{ status: string }>
}

/**
 * Starts one batch. The Cloud consent flag is only sent when the T03 gate
 * granted it for this batch; without that flag the backend refuses to send a
 * Cloud-routed file.
 */
export async function uploadFile(
  filePaths: string[],
  enhance = false,
  cloudConsent = false,
): Promise<UploadResponse> {
    const payload: Record<string, unknown> = { file_paths: filePaths };
    if (enhance) payload.enhance = enhance;
    if (cloudConsent) payload.consent_granted = true;
    const response = await fetch(buildApiUrl('/process'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }
    try {
        return (await response.json()) as UploadResponse;
    } catch {
        throw new Error('Server communication error');
    }
}
