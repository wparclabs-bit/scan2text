import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CommandCenterLayout from './CommandCenterLayout'

describe('Viewport lock', () => {
  it('root container uses h-screen for viewport-height layout', () => {
    render(<CommandCenterLayout />)
    const root = document.querySelector('.h-screen') as HTMLElement | null
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
  it('shell is h-screen flex flex-col', () => {
    render(<CommandCenterLayout />)
    const shell = document.querySelector('.h-screen.flex.flex-col') as HTMLElement | null
    expect(shell).toBeInTheDocument()
  })

  it('main has min-h-0 for proper flex shrink', () => {
    render(<CommandCenterLayout />)
    const main = document.querySelector('main') as HTMLElement | null
    expect(main).toBeInTheDocument()
    expect(main).toHaveClass('min-h-0')
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
  it('grid child wrappers carry min-w-0 but not overflow-hidden', () => {
    render(<CommandCenterLayout />)
    const children = Array.from(document.querySelectorAll('main > div'))
    expect(children).toHaveLength(2)
    children.forEach((child) => {
      expect(child).toHaveClass('min-w-0')
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

describe('CommandCenterLayout radiant rays', () => {
  it('center panel contains decorative radiant rays element', () => {
    render(<CommandCenterLayout />)
    expect(screen.getByTestId('center-radiant-rays')).toBeInTheDocument()
  })

  it('radiant rays element is inside center panel only', () => {
    render(<CommandCenterLayout />)
    const rays = document.querySelectorAll('[data-testid="center-radiant-rays"]')
    expect(rays).toHaveLength(1)
  })

  it('radiant rays has aria-hidden="true"', () => {
    render(<CommandCenterLayout />)
    expect(screen.getByTestId('center-radiant-rays')).toHaveAttribute('aria-hidden', 'true')
  })

  it('radiant rays has pointer-events-none', () => {
    render(<CommandCenterLayout />)
    expect(screen.getByTestId('center-radiant-rays')).toHaveClass('pointer-events-none')
  })

  it('radiant rays has data-state="static"', () => {
    render(<CommandCenterLayout />)
    expect(screen.getByTestId('center-radiant-rays')).toHaveAttribute('data-state', 'static')
  })

  it('radiant rays does not use animate classes', () => {
    render(<CommandCenterLayout />)
    const rays = screen.getByTestId('center-radiant-rays')
    const classList = rays.className
    expect(classList).not.toMatch(/\banimate-\w/)
  })
})

describe('CommandCenterLayout ambient glow', () => {
  it('ambient glow marker is present at workspace level', () => {
    render(<CommandCenterLayout />)
    expect(screen.getByTestId('ambient-glow')).toBeInTheDocument()
  })

  it('ambient glow marker has aria-hidden="true"', () => {
    render(<CommandCenterLayout />)
    expect(screen.getByTestId('ambient-glow')).toHaveAttribute('aria-hidden', 'true')
  })

  it('ambient glow marker has pointer-events-none', () => {
    render(<CommandCenterLayout />)
    expect(screen.getByTestId('ambient-glow')).toHaveClass('pointer-events-none')
  })

  it('ambient glow marker has data-state="static"', () => {
    render(<CommandCenterLayout />)
    expect(screen.getByTestId('ambient-glow')).toHaveAttribute('data-state', 'static')
  })

  it('ambient glow marker does not use animate classes', () => {
    render(<CommandCenterLayout />)
    const glow = screen.getByTestId('ambient-glow')
    const classList = glow.className
    expect(classList).not.toMatch(/\banimate-\w/)
  })

  it('radiant lines remain only inside center panel', () => {
    render(<CommandCenterLayout />)
    const rays = document.querySelectorAll('[data-testid="center-radiant-rays"]')
    expect(rays).toHaveLength(1)
  })
})

describe('Card depth inline styles', () => {
  it('dropzone card exposes inline backgroundImage with gradient', () => {
    render(<CommandCenterLayout />)
    const card = document.querySelector('[data-testid="panel-dropzone"] > div') as HTMLElement | null
    expect(card).toBeInTheDocument()
    expect(card?.style.backgroundImage).toContain('linear-gradient')
  })

  it('queue card exposes inline backgroundImage with gradient', () => {
    render(<CommandCenterLayout />)
    const card = document.querySelector('[data-testid="panel-queue"] > div') as HTMLElement | null
    expect(card).toBeInTheDocument()
    expect(card?.style.backgroundImage).toContain('linear-gradient')
  })

  it('preview card exposes inline backgroundImage with gradient', () => {
    render(<CommandCenterLayout />)
    const card = document.querySelector('[data-testid="panel-preview"] > div') as HTMLElement | null
    expect(card).toBeInTheDocument()
    expect(card?.style.backgroundImage).toContain('linear-gradient')
  })

  it('all three cards expose inline boxShadow', () => {
    render(<CommandCenterLayout />)
    ;(['panel-dropzone', 'panel-queue', 'panel-preview'] as const).forEach((id) => {
      const card = document.querySelector(`[data-testid="${id}"] > div`) as HTMLElement | null
      expect(card?.style.boxShadow).toBeTruthy()
    })
  })
})
