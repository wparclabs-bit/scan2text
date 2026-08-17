import { buildApiUrl } from './apiBase'

export interface UploadResponse {
  task_id: string
}

export interface TaskStatusResponse {
  task_id: string
  status: string
  result_markdown?: string
  error?: string
}

export interface CompletedTaskStatusResponse {
  task_id: string
  status: 'completed'
  result_markdown: string
  error?: string
}

export interface FailedTaskStatusResponse {
  task_id: string
  status: 'failed'
  error?: string
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

export async function getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
  const response = await fetch(buildApiUrl(`/status/${encodeURIComponent(taskId)}`))

  if (!response.ok) {
    throw new Error(`Status check failed: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<TaskStatusResponse>
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
    if (isTaskCompleted(response) || isTaskFailed(response)) {
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
  [key: string]: unknown
}

export interface SettingsPatch {
  output_dir?: string
  max_pdf_pages?: number
  cpu_threads?: number
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

export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('files', file, file.name)
  const response = await fetch(buildApiUrl('/process'), {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
  }
  try {
    return (await response.json()) as UploadResponse
  } catch {
    throw new Error('Server communication error')
  }
}
