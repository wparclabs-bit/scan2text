import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('palette lock — coffee-and-paper 2026-08-07', () => {
  const css = readFileSync(resolve(__dirname, '../index.css'), 'utf-8')

  describe('dark theme', () => {
    it('background is #000000', () => {
      expect(css).toContain('--background: #000000')
    })
    it('surface-left is #E1DCC9', () => {
      expect(css).toContain('#E1DCC9')
    })
    it('surface-center is #412D15', () => {
      expect(css).toContain('#412D15')
    })
    it('surface-right is #1F150C', () => {
      expect(css).toContain('#1F150C')
    })
    it('border is #3B2A18', () => {
      expect(css).toContain('--border: #3B2A18')
    })
    it('accent is #E3A55F', () => {
      expect(css).toContain('--accent: #E3A55F')
    })
  })

  describe('light theme', () => {
    it('background is #F9F8F6', () => {
      expect(css).toContain('--background: #F9F8F6')
    })
    it('surface-left is #EFE9E3', () => {
      expect(css).toContain('#EFE9E3')
    })
    it('surface-center is #D9CFC7', () => {
      expect(css).toContain('#D9CFC7')
    })
    it('surface-right is #C9B59C', () => {
      expect(css).toContain('#C9B59C')
    })
    it('border is #1F150C', () => {
      expect(css).toContain('--border: #1F150C')
    })
    it('accent is #92400E', () => {
      expect(css).toContain('--accent: #92400E')
    })
  })

  it('no purple hex values remain', () => {
    expect(css).not.toContain('#aa3bff')
    expect(css).not.toContain('#c084fc')
  })
})
