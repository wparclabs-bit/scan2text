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
    const header = screen.getByTestId('dropzone-header') as HTMLElement | null
    expect(header).toBeInTheDocument()
    expect(header).toHaveClass('font-bold')
    expect(header).toHaveClass('text-[#1F150C]')
  })

  it('dashed upload area has flex-1 class for fill-between-header-footer layout', () => {
    render(<DropZonePanel />)
    const dropzone = document.querySelector('[data-testid="dropzone-dashed"]') as HTMLElement | null
    expect(dropzone).toBeInTheDocument()
    expect(dropzone).toHaveClass('flex-1')
  })

  it('dashed upload area has w-full class', () => {
    render(<DropZonePanel />)
    const dropzone = document.querySelector('[data-testid="dropzone-dashed"]') as HTMLElement | null
    expect(dropzone).toBeInTheDocument()
    expect(dropzone).toHaveClass('w-full')
  })

  it('dashed upload area has flex-1 class which implies flexGrow 1', () => {
    render(<DropZonePanel />)
    const dropzone = document.querySelector('[data-testid="dropzone-dashed"]') as HTMLElement | null
    expect(dropzone).toBeInTheDocument()
    expect(dropzone).toHaveClass('flex-1')
    expect(dropzone).toHaveClass('min-h-0')
  })

  it('column container uses gap-1 px-4 pt-1 pb-1 between title and dropzone', () => {
    render(<DropZonePanel />)
    const column = Array.from(document.querySelectorAll('[data-testid="panel-dropzone"] > div > div'))
      .find((el) => el.classList.contains('gap-1') && el.classList.contains('px-4')) as HTMLElement | null
    expect(column).toBeInTheDocument()
    expect(column).toHaveClass('gap-1')
    expect(column).toHaveClass('px-4')
    expect(column).toHaveClass('pt-1')
    expect(column).toHaveClass('pb-1')
    expect(column).not.toHaveClass('gap-4')
    expect(column).not.toHaveClass('p-4')
  })

  it('dashed root carries flex-1 min-h-0 w-full from parent className', () => {
    render(<DropZonePanel />)
    const dropzone = document.querySelector('[data-testid="dropzone-dashed"]') as HTMLElement | null
    expect(dropzone).toBeInTheDocument()
    expect(dropzone).toHaveClass('flex-1')
    expect(dropzone).toHaveClass('min-h-0')
    expect(dropzone).toHaveClass('w-full')
  })

  it('panel root has min-w-0 and w-full to prevent grid item overflow', () => {
    render(<DropZonePanel />)
    const panel = screen.getByTestId('panel-dropzone') as HTMLElement
    expect(panel).toHaveClass('min-w-0')
    expect(panel).toHaveClass('w-full')
  })

  it('card root has h-full flex flex-col min-h-0 for unbroken height chain', () => {
    render(<DropZonePanel />)
    const card = document.querySelector('[data-testid="panel-dropzone"] > div') as HTMLElement | null
    expect(card).toBeInTheDocument()
    expect(card).toHaveClass('h-full')
    expect(card).toHaveClass('flex')
    expect(card).toHaveClass('flex-col')
    expect(card).toHaveClass('min-h-0')
  })

  it('column div has flex-1 min-h-0 flex flex-col gap-1 px-4 pt-1 pb-1 for stretch chain', () => {
    render(<DropZonePanel />)
    const column = Array.from(document.querySelectorAll('[data-testid="panel-dropzone"] > div > div'))
      .find((el) => el.classList.contains('gap-1') && el.classList.contains('px-4')) as HTMLElement | null
    expect(column).toBeInTheDocument()
    expect(column).toHaveClass('flex-1')
    expect(column).toHaveClass('min-h-0')
    expect(column).toHaveClass('flex')
    expect(column).toHaveClass('flex-col')
    expect(column).toHaveClass('gap-1')
    expect(column).toHaveClass('px-4')
    expect(column).toHaveClass('pt-1')
    expect(column).toHaveClass('pb-1')
    expect(column).not.toHaveClass('gap-4')
    expect(column).not.toHaveClass('p-4')
  })

  it('FileDropZone dashed root has flex-1 min-h-0 w-full flex flex-col', () => {
    render(<DropZonePanel />)
    const dropzone = document.querySelector('[data-testid="dropzone-dashed"]') as HTMLElement | null
    expect(dropzone).toBeInTheDocument()
    expect(dropzone).toHaveClass('flex-1')
    expect(dropzone).toHaveClass('min-h-0')
    expect(dropzone).toHaveClass('w-full')
    expect(dropzone).toHaveClass('flex')
    expect(dropzone).toHaveClass('flex-col')
  })

  it('footer element has shrink-0 to stay below stretch dropzone', () => {
    render(<DropZonePanel />)
    const footer = screen.getByTestId('dropzone-hint') as HTMLElement | null
    expect(footer).toBeInTheDocument()
    expect(footer).toHaveClass('shrink-0')
  })
})
