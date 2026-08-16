export function getApiBaseUrl(): string {
  return import.meta.env.PROD ? 'http://127.0.0.1:47351' : ''
}

export function buildApiUrl(path: string): string {
  const base = getApiBaseUrl()
  const normalized = path.startsWith('/') ? path : `/${path}`
  return base + normalized
}
