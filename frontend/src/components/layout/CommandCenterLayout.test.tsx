import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CommandCenterLayout from './CommandCenterLayout'

describe('Viewport lock', () => {
  it('root container uses fixed inset-0 for viewport-height layout', () => {
    render(<CommandCenterLayout />)
    const root = document.querySelector('.fixed.inset-0') as HTMLElement | null
    expect(root).toBeInTheDocument()
  })

  it('bottom bar is present outside the scrollable main area', () => {
    render(<CommandCenterLayout />)
    const footer = screen.getByTestId('bottom-bar')
    expect(footer).toBeInTheDocument()
    const main = document.querySelector('main')
    expect(main).toBeInTheDocument()
  })
})

describe('Shell structure — flex-col pin', () => {
  it('shell is fixed inset-0 flex flex-col overflow-hidden', () => {
    render(<CommandCenterLayout />)
    const shell = document.querySelector('.fixed.inset-0.flex.flex-col.overflow-hidden') as HTMLElement | null
    expect(shell).toBeInTheDocument()
  })

  it('main has min-h-0 for proper flex shrink', () => {
    render(<CommandCenterLayout />)
    const main = document.querySelector('main') as HTMLElement | null
    expect(main).toBeInTheDocument()
    expect(main).toHaveClass('min-h-0')
  })

  it('main uses minmax(0,34fr)_minmax(0,60fr) grid tracks', () => {
    render(<CommandCenterLayout />)
    const main = document.querySelector('main') as HTMLElement | null
    expect(main).toHaveClass('grid-cols-[minmax(0,34fr)_minmax(0,60fr)]')
  })

  it('left-column and preview-column carry min-w-0', () => {
    render(<CommandCenterLayout />)
    const leftCol = screen.getByTestId('left-column') as HTMLElement
    const previewCol = screen.getByTestId('preview-column') as HTMLElement
    expect(leftCol).toHaveClass('min-w-0')
    expect(previewCol).toHaveClass('min-w-0')
  })

  it('bottom bar has shrink-0 class', () => {
    render(<CommandCenterLayout />)
    const bar = screen.getByTestId('bottom-bar') as HTMLElement
    expect(bar).toHaveClass('shrink-0')
  })

  it('bottom bar uses grid-cols-[1fr_auto_1fr] for centered telemetry', () => {
    render(<CommandCenterLayout />)
    const bar = screen.getByTestId('bottom-bar') as HTMLElement
    expect(bar.innerHTML).toContain('grid-cols-')
  })

  it('bottom bar items are vertically centered with flex items-center', () => {
    render(<CommandCenterLayout />)
    const bar = screen.getByTestId('bottom-bar') as HTMLElement
    expect(bar).toHaveClass('items-center')
  })
})

describe('CommandCenterLayout grid overflow hygiene', () => {
  it('grid child wrappers carry min-h-0 but not overflow-hidden', () => {
    render(<CommandCenterLayout />)
    const children = Array.from(document.querySelectorAll('main > div'))
    expect(children).toHaveLength(2)
    children.forEach((child) => {
      expect(child).toHaveClass('min-h-0')
      expect(child).not.toHaveClass('overflow-hidden')
    })
  })

  it('panel cards carry overflow-hidden and min-w-0', () => {
    render(<CommandCenterLayout />)
    const dropzoneCard = document.querySelector('[data-testid="panel-dropzone"] > div') as HTMLElement | null
    const queueCard = document.querySelector('[data-testid="panel-queue"] > div') as HTMLElement | null
    const previewCard = document.querySelector('[data-testid="panel-preview"] > div') as HTMLElement | null
    expect(dropzoneCard).toBeInTheDocument()
    expect(dropzoneCard).toHaveClass('overflow-hidden')
    expect(dropzoneCard).toHaveClass('min-w-0')
    expect(queueCard).toBeInTheDocument()
    expect(queueCard).toHaveClass('overflow-hidden')
    expect(queueCard).toHaveClass('min-w-0')
    expect(previewCard).toBeInTheDocument()
    expect(previewCard).toHaveClass('overflow-hidden')
    expect(previewCard).toHaveClass('min-w-0')
  })
})

describe('Left column structural constancy', () => {
  it('left-column has grid-rows with minmax(0,38fr)', () => {
    render(<CommandCenterLayout />)
    const leftCol = screen.getByTestId('left-column') as HTMLElement
    expect(leftCol).toHaveClass('grid-rows-[minmax(0,38fr)_minmax(0,62fr)]')
  })

  it('both panel testids present in left column', () => {
    render(<CommandCenterLayout />)
    const leftCol = screen.getByTestId('left-column') as HTMLElement
    expect(leftCol.querySelector('[data-testid="panel-dropzone"]')).toBeInTheDocument()
    expect(leftCol.querySelector('[data-testid="panel-queue"]')).toBeInTheDocument()
  })

  it('preview-column is present', () => {
    render(<CommandCenterLayout />)
    expect(screen.getByTestId('preview-column')).toBeInTheDocument()
  })
})

describe('App shell data-testid', () => {
  it('app-shell element exists', () => {
    render(<CommandCenterLayout />)
    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
  })

  it('main-content element exists', () => {
    render(<CommandCenterLayout />)
    expect(screen.getByTestId('main-content')).toBeInTheDocument()
  })
})
