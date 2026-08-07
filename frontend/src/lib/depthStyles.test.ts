import { describe, it, expect } from 'vitest'
import { getDepthStyle } from './depthStyles'

describe('getDepthStyle', () => {
  describe('dark theme', () => {
    it('left panel has correct background color', () => {
      const style = getDepthStyle({ theme: 'dark', panel: 'left' })
      expect(style.backgroundColor).toBe('#E1DCC9')
    })

    it('center panel has correct background color', () => {
      const style = getDepthStyle({ theme: 'dark', panel: 'center' })
      expect(style.backgroundColor).toBe('#412D15')
    })

    it('right panel has correct background color', () => {
      const style = getDepthStyle({ theme: 'dark', panel: 'right' })
      expect(style.backgroundColor).toBe('#1F150C')
    })

    it('left overlay uses rgba(31,21,12,0.12)', () => {
      const style = getDepthStyle({ theme: 'dark', panel: 'left' })
      expect(style.backgroundImage).toContain('rgba(31,21,12,0.12)')
    })

    it('center overlay uses rgba(0,0,0,0.22)', () => {
      const style = getDepthStyle({ theme: 'dark', panel: 'center' })
      expect(style.backgroundImage).toContain('rgba(0,0,0,0.22)')
    })

    it('right overlay uses rgba(0,0,0,0.28)', () => {
      const style = getDepthStyle({ theme: 'dark', panel: 'right' })
      expect(style.backgroundImage).toContain('rgba(0,0,0,0.28)')
    })

    it('all panels have outer shadow with dark opacity', () => {
      ;(['left', 'center', 'right'] as const).forEach((panel) => {
        const style = getDepthStyle({ theme: 'dark', panel })
        expect(style.boxShadow).toContain('rgba(0,0,0,0.55)')
      })
    })

    it('all panels have inset top highlight', () => {
      ;(['left', 'center', 'right'] as const).forEach((panel) => {
        const style = getDepthStyle({ theme: 'dark', panel })
        expect(style.boxShadow).toContain('inset 0 1px 0 rgba(255,255,255,0.06)')
      })
    })

    it('uses longhand background-image property', () => {
      const style = getDepthStyle({ theme: 'dark', panel: 'left' })
      expect(style.backgroundImage).toMatch(/linear-gradient/)
    })

    it('uses longhand backgroundColor property', () => {
      const style = getDepthStyle({ theme: 'dark', panel: 'left' })
      expect(style.backgroundColor).toMatch(/^#[0-9a-fA-F]{6}$/)
    })
  })

  describe('light theme', () => {
    it('left panel has correct background color', () => {
      const style = getDepthStyle({ theme: 'light', panel: 'left' })
      expect(style.backgroundColor).toBe('#EFE9E3')
    })

    it('center panel has correct background color', () => {
      const style = getDepthStyle({ theme: 'light', panel: 'center' })
      expect(style.backgroundColor).toBe('#D9CFC7')
    })

    it('right panel has correct background color', () => {
      const style = getDepthStyle({ theme: 'light', panel: 'right' })
      expect(style.backgroundColor).toBe('#C9B59C')
    })

    it('all panels use rgba(31,21,12,0.07) overlay', () => {
      ;(['left', 'center', 'right'] as const).forEach((panel) => {
        const style = getDepthStyle({ theme: 'light', panel })
        expect(style.backgroundImage).toContain('rgba(31,21,12,0.07)')
      })
    })

    it('all panels have light shadow with brown opacity', () => {
      ;(['left', 'center', 'right'] as const).forEach((panel) => {
        const style = getDepthStyle({ theme: 'light', panel })
        expect(style.boxShadow).toContain('rgba(31,21,12,0.22)')
      })
    })

    it('all panels have inset top highlight', () => {
      ;(['left', 'center', 'right'] as const).forEach((panel) => {
        const style = getDepthStyle({ theme: 'light', panel })
        expect(style.boxShadow).toContain('inset 0 1px 0 rgba(255,255,255,0.65)')
      })
    })
  })
})
