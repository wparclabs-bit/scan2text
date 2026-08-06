import { describe, it, expect } from 'vitest'
import { validateFile, validateFilesBatch } from './fileValidation'

describe('validateFile', () => {
  it('should accept PNG files within size limit', () => {
    const file = new File(['content'], 'test.png', { type: 'image/png' })
    expect(validateFile(file).valid).toBe(true)
  })

  it('should accept JPG files within size limit', () => {
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
    expect(validateFile(file).valid).toBe(true)
  })

  it('should accept JPEG files within size limit', () => {
    const file = new File(['content'], 'test.jpeg', { type: 'image/jpeg' })
    expect(validateFile(file).valid).toBe(true)
  })

  it('should accept WEBP files within size limit', () => {
    const file = new File(['content'], 'test.webp', { type: 'image/webp' })
    expect(validateFile(file).valid).toBe(true)
  })

  it('should accept PDF files within size limit', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    expect(validateFile(file).valid).toBe(true)
  })

  it('should accept a file exactly 50MB', () => {
    const bytes = 50 * 1024 * 1024
    const file = new File([new ArrayBuffer(bytes)], 'big.png', { type: 'image/png' })
    Object.defineProperty(file, 'size', { value: bytes })
    expect(validateFile(file).valid).toBe(true)
  })

  it('should reject a file larger than 50MB', () => {
    const bytes = 50 * 1024 * 1024 + 1
    const file = new File([new ArrayBuffer(bytes)], 'big.png', { type: 'image/png' })
    Object.defineProperty(file, 'size', { value: bytes })
    expect(validateFile(file).valid).toBe(false)
  })

  it('should reject TXT files', () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' })
    expect(validateFile(file).valid).toBe(false)
  })

  it('should reject MP4 files', () => {
    const file = new File(['content'], 'test.mp4', { type: 'video/mp4' })
    expect(validateFile(file).valid).toBe(false)
  })

  it('should return an error message for invalid files', () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' })
    const result = validateFile(file)
    expect(result.error).toBeDefined()
    expect(typeof result.error).toBe('string')
  })

  it('should return an error message for oversized files', () => {
    const bytes = 50 * 1024 * 1024 + 1
    const file = new File([new ArrayBuffer(bytes)], 'big.png', { type: 'image/png' })
    Object.defineProperty(file, 'size', { value: bytes })
    const result = validateFile(file)
    expect(result.error).toBeDefined()
  })

  it('should accept files with .png extension even if MIME is empty', () => {
    const file = new File(['content'], 'test.png')
    expect(validateFile(file).valid).toBe(true)
  })

  it('should accept files with .pdf extension even if MIME is empty', () => {
    const file = new File(['content'], 'test.pdf')
    expect(validateFile(file).valid).toBe(true)
  })

  it('should reject files with .txt extension even if MIME is empty', () => {
    const file = new File(['content'], 'test.txt')
    expect(validateFile(file).valid).toBe(false)
  })

  it('should return reason "unsupported" for TIFF files', () => {
    const file = new File(['content'], 'test.tif', { type: 'image/tiff' })
    const result = validateFile(file)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('unsupported')
  })

  it('should return reason "unsupported" for BMP files', () => {
    const file = new File(['content'], 'test.bmp', { type: 'image/bmp' })
    const result = validateFile(file)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('unsupported')
  })

  it('should return reason "tooLarge" when file exceeds size limit', () => {
    const bytes = 50 * 1024 * 1024 + 1
    const file = new File([new ArrayBuffer(bytes)], 'big.png', { type: 'image/png' })
    Object.defineProperty(file, 'size', { value: bytes })
    const result = validateFile(file)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('tooLarge')
  })

  it('should check type before size for unsupported oversized files', () => {
    const bytes = 50 * 1024 * 1024 + 1
    const file = new File([new ArrayBuffer(bytes)], 'test.txt', { type: 'text/plain' })
    Object.defineProperty(file, 'size', { value: bytes })
    const result = validateFile(file)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('unsupported')
  })
})

describe('validateFilesBatch', () => {
  it('should accept all valid files in a batch', () => {
    const files = [
      new File(['a'], 'first.png', { type: 'image/png' }),
      new File(['b'], 'second.jpg', { type: 'image/jpeg' }),
      new File(['c'], 'third.pdf', { type: 'application/pdf' }),
    ]
    const result = validateFilesBatch(files)
    expect(result.validFiles).toHaveLength(3)
    expect(result.skippedFiles).toHaveLength(0)
    expect(result.validFiles.map((f) => f.name)).toEqual(['first.png', 'second.jpg', 'third.pdf'])
  })

  it('should reject TIFF and BMP files', () => {
    const files = [
      new File(['a'], 'test.tif', { type: 'image/tiff' }),
      new File(['b'], 'test.bmp', { type: 'image/bmp' }),
    ]
    const result = validateFilesBatch(files)
    expect(result.validFiles).toHaveLength(0)
    expect(result.skippedFiles).toHaveLength(2)
    expect(result.skippedFiles[0].reason).toBe('unsupported')
    expect(result.skippedFiles[1].reason).toBe('unsupported')
  })

  it('should reject files over 50MB', () => {
    const bytes = 50 * 1024 * 1024 + 1
    const bigFile = new File([new ArrayBuffer(bytes)], 'big.png', { type: 'image/png' })
    Object.defineProperty(bigFile, 'size', { value: bytes })
    const result = validateFilesBatch([bigFile])
    expect(result.validFiles).toHaveLength(0)
    expect(result.skippedFiles).toHaveLength(1)
    expect(result.skippedFiles[0].reason).toBe('tooLarge')
  })

  it('should return validFiles and skippedFiles correctly for mixed batch', () => {
    const validPng = new File(['a'], 'valid.png', { type: 'image/png' })
    const invalidTxt = new File(['b'], 'invalid.txt', { type: 'text/plain' })
    const validPdf = new File(['c'], 'valid.pdf', { type: 'application/pdf' })
    const bytes = 50 * 1024 * 1024 + 1
    const bigFile = new File([new ArrayBuffer(bytes)], 'big.jpg', { type: 'image/jpeg' })
    Object.defineProperty(bigFile, 'size', { value: bytes })

    const result = validateFilesBatch([validPng, invalidTxt, validPdf, bigFile])
    expect(result.validFiles).toHaveLength(2)
    expect(result.skippedFiles).toHaveLength(2)
    expect(result.validFiles.map((f) => f.name)).toEqual(['valid.png', 'valid.pdf'])
    expect(result.skippedFiles[0].fileName).toBe('invalid.txt')
    expect(result.skippedFiles[0].reason).toBe('unsupported')
    expect(result.skippedFiles[1].fileName).toBe('big.jpg')
    expect(result.skippedFiles[1].reason).toBe('tooLarge')
  })

  it('should preserve FIFO order in validFiles', () => {
    const files = [
      new File(['a'], 'third.png', { type: 'image/png' }),
      new File(['b'], 'first.jpg', { type: 'image/jpeg' }),
      new File(['c'], 'second.webp', { type: 'image/webp' }),
    ]
    const result = validateFilesBatch(files)
    expect(result.validFiles.map((f) => f.name)).toEqual(['third.png', 'first.jpg', 'second.webp'])
  })

  it('should return empty arrays for empty input', () => {
    const result = validateFilesBatch([])
    expect(result.validFiles).toEqual([])
    expect(result.skippedFiles).toEqual([])
  })

  it('should include size in skippedFile entries', () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' })
    Object.defineProperty(file, 'size', { value: 12345 })
    const result = validateFilesBatch([file])
    expect(result.skippedFiles[0].size).toBe(12345)
  })
})
