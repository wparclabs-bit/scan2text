import { describe, it, expect } from 'vitest'
import {
  CEILING_BYTES,
  LOCAL_THRESHOLD_BYTES,
  exceedsCeiling,
  mirrorRoute,
} from './cloudRouting'

const MEGABYTE = 1024 * 1024

describe('cloudRouting', () => {
  it('mirrors the backend 8 MB and 50 MB bounds', () => {
    expect(LOCAL_THRESHOLD_BYTES).toBe(8 * MEGABYTE)
    expect(CEILING_BYTES).toBe(50 * MEGABYTE)
  })

  it('accepts a file above the local threshold so it can reach the routing decision', () => {
    expect(exceedsCeiling(12 * MEGABYTE)).toBe(false)
  })

  it('rejects a file above the ceiling early', () => {
    expect(exceedsCeiling(50 * MEGABYTE + 1)).toBe(true)
  })

  it('mirrors the per-file route for convenience only', () => {
    expect(mirrorRoute(2 * MEGABYTE)).toBe('local')
    expect(mirrorRoute(8 * MEGABYTE)).toBe('local')
    expect(mirrorRoute(12 * MEGABYTE)).toBe('cloud')
    expect(mirrorRoute(50 * MEGABYTE + 1)).toBeNull()
  })
})
