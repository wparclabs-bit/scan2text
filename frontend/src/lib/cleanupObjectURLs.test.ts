import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cleanupObjectURLs } from './cleanupObjectURLs'

describe('cleanupObjectURLs', () => {
  let revokeObjectURL: ReturnType<typeof vi.fn>

  beforeEach(() => {
    revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { revokeObjectURL: revokeObjectURL })
  })

  it('should revoke blob URLs', () => {
    cleanupObjectURLs(['blob:http://example.com/abc', 'blob:http://example.com/def'])
    expect(revokeObjectURL).toHaveBeenCalledTimes(2)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:http://example.com/abc')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:http://example.com/def')
  })

  it('should not revoke non-blob URLs', () => {
    cleanupObjectURLs(['https://example.com/image.png', 'http://example.com/pdf.pdf'])
    expect(revokeObjectURL).not.toHaveBeenCalled()
  })

  it('should handle null and undefined safely', () => {
    cleanupObjectURLs([null, undefined, 'blob:http://example.com/test'])
    expect(revokeObjectURL).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:http://example.com/test')
  })

  it('should handle an empty array', () => {
    cleanupObjectURLs([])
    expect(revokeObjectURL).not.toHaveBeenCalled()
  })

  it('should skip null entries without error', () => {
    expect(() => cleanupObjectURLs([null])).not.toThrow()
  })

  it('should skip undefined entries without error', () => {
    expect(() => cleanupObjectURLs([undefined])).not.toThrow()
  })
})
