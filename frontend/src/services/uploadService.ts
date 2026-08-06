const API_BASE = 'http://127.0.0.1:8000'

export interface UploadResponse {
  task_id: string
}

export async function uploadFiles(files: File[]): Promise<UploadResponse> {
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }
  const response = await fetch(`${API_BASE}/process`, {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<UploadResponse>
}
