import { describe, it, expect } from 'vitest'
import { fileKind } from './fileKind'

describe('fileKind', () => {
  it('returns image for .png', () => {
    expect(fileKind('scan.png')).toBe('image')
  })

  it('returns image for .jpg', () => {
    expect(fileKind('photo.jpg')).toBe('image')
  })

  it('returns image for .jpeg', () => {
    expect(fileKind('image.jpeg')).toBe('image')
  })

  it('returns image for .webp', () => {
    expect(fileKind('anim.webp')).toBe('image')
  })

  it('returns pdf for .pdf', () => {
    expect(fileKind('doc.pdf')).toBe('pdf')
  })

  it('returns unknown for unsupported extension', () => {
    expect(fileKind('data.txt')).toBe('unknown')
  })

  it('is case-insensitive', () => {
    expect(fileKind('scan.PNG')).toBe('image')
    expect(fileKind('scan.Pdf')).toBe('pdf')
  })

  it('handles filenames with multiple dots', () => {
    expect(fileKind('my.scan.pdf')).toBe('pdf')
    expect(fileKind('my.scan.JPG')).toBe('image')
  })
})
