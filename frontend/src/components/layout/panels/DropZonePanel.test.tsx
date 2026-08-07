import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import DropZonePanel from './DropZonePanel'

vi.mock('@/stores/preferencesStore', () => ({
  usePreferenceStore: vi.fn(() => 'dark'),
}))

describe('DropZonePanel background image', () => {
  it('renders panel-dropzone with background image at 0.25 opacity', () => {
    render(<DropZonePanel />)
    const bgLayer = document.querySelector('[data-testid="panel-dropzone"] > div > [aria-hidden]') as HTMLElement | null
    expect(bgLayer).toBeInTheDocument()
    expect(bgLayer?.style.backgroundImage).toContain('bacground-left-top-panel.jpg')
    expect(bgLayer?.style.opacity).toBe('0.25')
  })

  it('background image layer has pointer-events-none', () => {
    render(<DropZonePanel />)
    const bgLayer = document.querySelector('[data-testid="panel-dropzone"] > div > [aria-hidden]') as HTMLElement | null
    expect(bgLayer).toBeInTheDocument()
    expect(bgLayer).toHaveClass('pointer-events-none')
  })

  it('dropzone hint remains readable above background', () => {
    render(<DropZonePanel />)
    expect(screen.getByTestId('dropzone-hint')).toBeInTheDocument()
  })
})
