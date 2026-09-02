import { describe, it, expect, vi, afterEach } from 'vitest'
import { getApiBaseUrl, buildApiUrl } from './apiBase'

describe('getApiBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should return unified dev port URL in dev mode', () => {
    vi.stubEnv('PROD', false)
    expect(getApiBaseUrl()).toBe('http://127.0.0.1:47351')
  })

  it('should return production backend URL when PROD is true', () => {
    vi.stubEnv('PROD', true)
    expect(getApiBaseUrl()).toBe('http://127.0.0.1:47351')
  })
})

describe('buildApiUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should return absolute URL in dev mode (unified port)', () => {
    vi.stubEnv('PROD', false)
    expect(buildApiUrl('/api/health')).toBe('http://127.0.0.1:47351/api/health')
  })

  it('should return absolute URL in prod mode', () => {
    vi.stubEnv('PROD', true)
    expect(buildApiUrl('/api/health')).toBe('http://127.0.0.1:47351/api/health')
  })

  it('should prepend a leading slash when missing (dev mode)', () => {
    vi.stubEnv('PROD', false)
    expect(buildApiUrl('api/health')).toBe('http://127.0.0.1:47351/api/health')
  })

  it('should prepend a leading slash when missing (prod mode)', () => {
    vi.stubEnv('PROD', true)
    expect(buildApiUrl('api/health')).toBe('http://127.0.0.1:47351/api/health')
  })
})
