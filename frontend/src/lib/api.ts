import { buildApiUrl } from './apiBase'

export interface UploadResponse {
  task_id: string
}

export interface TaskStatusResponse {
  task_id: string
  status: string
  result_markdown?: string
  error?: string
  error_code?: string
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
  error_code?: string
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

export async function uploadFile(filePaths: string[], enhance = false): Promise<UploadResponse> {
    const payload = enhance ? { file_paths: filePaths, enhance } : { file_paths: filePaths };
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
