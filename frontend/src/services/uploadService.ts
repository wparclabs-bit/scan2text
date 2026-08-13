import { buildApiUrl } from '@/lib/apiBase'

export interface UploadResponse {
  task_id: string
}

export async function uploadFiles(files: File[]): Promise<UploadResponse> {
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }
  const response = await fetch(buildApiUrl('/process'), {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<UploadResponse>
}
