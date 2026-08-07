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

    it('left panel uses white top-highlight gradient', () => {
      const style = getDepthStyle({ theme: 'dark', panel: 'left' })
      expect(style.backgroundImage).toContain('rgba(255,255,255,0.35)')
      expect(style.backgroundImage).toContain('rgba(31,21,12,0.10)')
    })

    it('center panel uses warm overlay gradient', () => {
      const style = getDepthStyle({ theme: 'dark', panel: 'center' })
      expect(style.backgroundImage).toContain('rgba(227,165,95,0.18)')
      expect(style.backgroundImage).toContain('rgba(0,0,0,0.25)')
    })

    it('right panel uses dark overlay gradient', () => {
      const style = getDepthStyle({ theme: 'dark', panel: 'right' })
      expect(style.backgroundImage).toContain('rgba(227,165,95,0.10)')
      expect(style.backgroundImage).toContain('rgba(0,0,0,0.30)')
    })

    it('left panel has shadow with inset white highlight and soft outer shadow', () => {
      const style = getDepthStyle({ theme: 'dark', panel: 'left' })
      expect(style.boxShadow).toContain('inset 0 1px 0 rgba(255,255,255,0.4)')
      expect(style.boxShadow).toContain('rgba(0,0,0,0.35)')
    })

    it('center panel has shadow with warm inset highlight and strong outer shadow', () => {
      const style = getDepthStyle({ theme: 'dark', panel: 'center' })
      expect(style.boxShadow).toContain('inset 0 1px 0 rgba(242,235,221,0.12)')
      expect(style.boxShadow).toContain('rgba(0,0,0,0.45)')
    })

    it('right panel has shadow with subtle warm inset and deepest outer shadow', () => {
      const style = getDepthStyle({ theme: 'dark', panel: 'right' })
      expect(style.boxShadow).toContain('inset 0 1px 0 rgba(242,235,221,0.08)')
      expect(style.boxShadow).toContain('rgba(0,0,0,0.5)')
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

    it('all panels use white top-highlight gradient in light mode', () => {
      ;(['left', 'center', 'right'] as const).forEach((panel) => {
        const style = getDepthStyle({ theme: 'light', panel })
        expect(style.backgroundImage).toContain('rgba(255,255,255,0.')
      })
    })

    it('all panels use brown bottom fade in light mode', () => {
      ;(['left', 'center', 'right'] as const).forEach((panel) => {
        const style = getDepthStyle({ theme: 'light', panel })
        expect(style.backgroundImage).toContain('rgba(31,21,12,0.')
      })
    })

    it('all panels have light shadow with brown outer opacity', () => {
      ;(['left', 'center', 'right'] as const).forEach((panel) => {
        const style = getDepthStyle({ theme: 'light', panel })
        expect(style.boxShadow).toContain('rgba(31,21,12,0.')
      })
    })

    it('all panels have inset top highlight in light mode', () => {
      ;(['left', 'center', 'right'] as const).forEach((panel) => {
        const style = getDepthStyle({ theme: 'light', panel })
        expect(style.boxShadow).toContain('inset 0 1px 0 rgba(255,255,255,0.6)')
      })
    })
  })
})
