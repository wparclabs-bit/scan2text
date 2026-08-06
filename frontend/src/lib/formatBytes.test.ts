import { describe, it, expect } from 'vitest'
import { formatBytes } from './formatBytes'

describe('formatBytes', () => {
  it('should format 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('should format bytes below 1KB', () => {
    expect(formatBytes(500)).toBe('500 B')
  })

  it('should format exactly 1KB', () => {
    expect(formatBytes(1024)).toBe('1 KB')
  })

  it('should format bytes above 1KB', () => {
    expect(formatBytes(1500)).toBe('1 KB')
  })

  it('should format exactly 50MB', () => {
    expect(formatBytes(52428800)).toBe('50 MB')
  })

  it('should round KB values', () => {
    expect(formatBytes(1536)).toBe('2 KB')
  })

  it('should round MB values', () => {
    expect(formatBytes(78643200)).toBe('75 MB')
  })
})
