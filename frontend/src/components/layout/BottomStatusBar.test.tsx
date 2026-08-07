import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BottomStatusBar from './BottomStatusBar'

describe('BottomStatusBar', () => {
  it('renders with data-testid="bottom-bar"', () => {
    render(<BottomStatusBar />)
    expect(screen.getByTestId('bottom-bar')).toBeInTheDocument()
  })

  it('displays Worker Idle status text', () => {
    render(<BottomStatusBar />)
    expect(screen.getByText('Worker: Idle')).toBeInTheDocument()
  })

  it('displays RAM usage text', () => {
    render(<BottomStatusBar />)
    expect(screen.getByText('RAM: 1.8 GB')).toBeInTheDocument()
  })

  it('displays app version text', () => {
    render(<BottomStatusBar />)
    expect(screen.getByText('v0.1.0-demo')).toBeInTheDocument()
  })

  it('separates metrics with subtle dividers', () => {
    render(<BottomStatusBar />)
    const footer = screen.getByTestId('bottom-bar')
    const spans = footer.querySelectorAll('span')
    // 3 content spans + 2 divider spans = 5 total
    expect(spans.length).toBe(5)
  })

  it('footer does not have border-t class', () => {
    render(<BottomStatusBar />)
    const footer = screen.getByTestId('bottom-bar')
    expect(footer).not.toHaveClass('border-t')
  })
})
