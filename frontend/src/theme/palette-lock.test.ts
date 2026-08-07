import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('palette lock — coffee-and-paper 2026-08-07', () => {
  const css = readFileSync(resolve(__dirname, '../index.css'), 'utf-8')

  describe('dark theme', () => {
    it('background is #080502', () => {
      expect(css).toContain('--background: #080502')
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

  describe('depth recipe', () => {
    it('has gradient declarations on surface classes', () => {
      expect(css).toContain('linear-gradient(to bottom, #EDE8D8 0%, #E1DCC9 100%)')
      expect(css).toContain('linear-gradient(to bottom, #4D3619 0%, #412D15 100%)')
      expect(css).toContain('linear-gradient(to bottom, #2A1C10 0%, #1F150C 100%)')
    })

    it('has shadow declarations on dark surfaces', () => {
      expect(css).toContain('rgba(0,0,0,0.7)')
      expect(css).toContain('inset 0 1px 0 rgba(255,255,255,0.06)')
    })

    it('has shadow declarations on light surfaces', () => {
      expect(css).toContain('rgba(31,21,12,0.28)')
      expect(css).toContain('inset 0 1px 0 rgba(255,255,255,0.65)')
    })

    it('has warm glow radial gradient in dark mode', () => {
      expect(css).toContain('radial-gradient(600px at 85% -10%, rgba(227,165,95,0.07), transparent)')
    })
  })

  describe('panel cards — no border class', () => {
    const dropzonePanel = readFileSync(resolve(__dirname, '../components/layout/panels/DropZonePanel.tsx'), 'utf-8')
    const queuePanel = readFileSync(resolve(__dirname, '../components/layout/panels/QueuePanel.tsx'), 'utf-8')
    const previewPanel = readFileSync(resolve(__dirname, '../components/layout/panels/PreviewPanel.tsx'), 'utf-8')

    it('DropZonePanel card has no border-border class', () => {
      expect(dropzonePanel).not.toContain('border border-border')
    })

    it('QueuePanel card has no border-border class', () => {
      expect(queuePanel).not.toContain('border border-border')
    })

    it('PreviewPanel card has no border-border class', () => {
      expect(previewPanel).not.toContain('border border-border')
    })
  })

  describe('depth panels use inline styles', () => {
    const dropzonePanel = readFileSync(resolve(__dirname, '../components/layout/panels/DropZonePanel.tsx'), 'utf-8')
    const queuePanel = readFileSync(resolve(__dirname, '../components/layout/panels/QueuePanel.tsx'), 'utf-8')
    const previewPanel = readFileSync(resolve(__dirname, '../components/layout/panels/PreviewPanel.tsx'), 'utf-8')

    it('DropZonePanel imports getDepthStyle', () => {
      expect(dropzonePanel).toContain("from '@/lib/depthStyles'")
    })

    it('QueuePanel imports getDepthStyle', () => {
      expect(queuePanel).toContain("from '@/lib/depthStyles'")
    })

    it('PreviewPanel imports getDepthStyle', () => {
      expect(previewPanel).toContain("from '@/lib/depthStyles'")
    })

    it('DropZonePanel applies style prop instead of depth-panel-left class', () => {
      expect(dropzonePanel).toContain('style={depthStyle}')
      expect(dropzonePanel).not.toContain('depth-panel-left')
    })

    it('QueuePanel applies style prop instead of depth-panel-center class', () => {
      expect(queuePanel).toContain('style={depthStyle}')
      expect(queuePanel).not.toContain('depth-panel-center')
    })

    it('PreviewPanel applies style prop instead of depth-panel-right class', () => {
      expect(previewPanel).toContain('style={depthStyle}')
      expect(previewPanel).not.toContain('depth-panel-right')
    })
  })
})
