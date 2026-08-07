import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CommandCenterLayout from './CommandCenterLayout'

describe('CommandCenterLayout grid overflow hygiene', () => {
  it('each grid child wrapper carries min-w-0 and overflow-hidden', () => {
    render(<CommandCenterLayout />)
    const children = Array.from(document.querySelectorAll('main > div'))
    expect(children).toHaveLength(3)
    children.forEach((child) => {
      expect(child).toHaveClass('min-w-0')
      expect(child).toHaveClass('overflow-hidden')
    })
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
