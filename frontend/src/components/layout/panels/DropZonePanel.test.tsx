import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import DropZonePanel from './DropZonePanel'

vi.mock('@/stores/preferencesStore', () => ({
  usePreferenceStore: vi.fn(() => 'dark'),
}))

describe('DropZonePanel background image', () => {
  it('renders panel-dropzone with background image at 0.15 opacity', () => {
    render(<DropZonePanel />)
    const bgLayer = document.querySelector('[data-testid="panel-dropzone"] > div > [aria-hidden]') as HTMLElement | null
    expect(bgLayer).toBeInTheDocument()
    expect(bgLayer?.style.backgroundImage).toContain('bacground-left-top-panel.jpg')
    expect(bgLayer?.style.opacity).toBe('0.15')
  })

  it('background image layer has pointer-events-none', () => {
    render(<DropZonePanel />)
    const bgLayer = document.querySelector('[data-testid="panel-dropzone"] > div > [aria-hidden]') as HTMLElement | null
    expect(bgLayer).toBeInTheDocument()
    expect(bgLayer).toHaveClass('pointer-events-none')
  })

  it('background image uses single-value background-size (not 2-value)', () => {
    render(<DropZonePanel />)
    const bgLayer = document.querySelector('[data-testid="panel-dropzone"] > div > [aria-hidden]') as HTMLElement | null
    expect(bgLayer).toBeInTheDocument()
    expect(bgLayer?.style.backgroundSize).toBe('100%')
    expect(bgLayer?.style.backgroundSize).not.toMatch(/\s/)
  })

  it('dropzone hint remains readable above background', () => {
    render(<DropZonePanel />)
    expect(screen.getByTestId('dropzone-hint')).toBeInTheDocument()
  })

  it('header text is bold with ink color #1F150C', () => {
    render(<DropZonePanel />)
    const scrollArea = screen.getByTestId('dropzone-scroll-area')
    const header = scrollArea.querySelector('p') as HTMLElement | null
    expect(header).toBeInTheDocument()
    expect(header).toHaveClass('font-bold')
    expect(header).toHaveClass('text-[#1F150C]')
  })

  it('dashed upload area has flex-1 class for fill-between-header-footer layout', () => {
    render(<DropZonePanel />)
    const dropzone = document.querySelector('[data-testid="dropzone"]') as HTMLElement | null
    expect(dropzone).toBeInTheDocument()
    expect(dropzone).toHaveClass('flex-1')
  })

  it('dashed upload area has w-full class', () => {
    render(<DropZonePanel />)
    const dropzone = document.querySelector('[data-testid="dropzone"]') as HTMLElement | null
    expect(dropzone).toBeInTheDocument()
    expect(dropzone).toHaveClass('w-full')
  })

  it('dashed upload area has flex-1 class which implies flexGrow 1', () => {
    render(<DropZonePanel />)
    const dropzone = document.querySelector('[data-testid="dropzone"]') as HTMLElement | null
    expect(dropzone).toBeInTheDocument()
    expect(dropzone).toHaveClass('flex-1')
    expect(dropzone).toHaveClass('min-h-0')
  })
})
