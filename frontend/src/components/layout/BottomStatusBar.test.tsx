import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import BottomStatusBar from './BottomStatusBar'

vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(),
}))

const { useTranslation } = await import('react-i18next')

describe('BottomStatusBar structure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useTranslation as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      t: (key: string) => {
        switch (key) {
          case 'bottomBar.workerLabel':
            return 'Worker: Idle'
          case 'bottomBar.ramUsage':
            return 'RAM: —'
          case 'actions.shareTooltip':
            return 'Share app link'
          default:
            return key
        }
      },
    })
  })

  it('footer has shrink-0 class for pinned layout', () => {
    render(<BottomStatusBar />)
    const footer = screen.getByTestId('bottom-bar') as HTMLElement
    expect(footer).toHaveClass('shrink-0')
  })

  it('footer uses flex items-center for vertical centering', () => {
    render(<BottomStatusBar />)
    const footer = screen.getByTestId('bottom-bar') as HTMLElement
    expect(footer).toHaveClass('flex')
    expect(footer).toHaveClass('items-center')
  })

  it('footer contains grid-cols layout for 3-zone centering', () => {
    render(<BottomStatusBar />)
    const footer = screen.getByTestId('bottom-bar') as HTMLElement
    expect(footer.innerHTML).toContain('grid-cols-')
  })

  it('feedback button is present in right zone', () => {
    render(<BottomStatusBar />)
    expect(screen.getByTestId('feedback-button')).toBeInTheDocument()
  })

  it('share button is present in right zone', () => {
    render(<BottomStatusBar />)
    expect(screen.getByTestId('share-button')).toBeInTheDocument()
  })

  it('worker label is present in center zone', () => {
    render(<BottomStatusBar />)
    const footer = screen.getByTestId('bottom-bar') as HTMLElement
    expect(footer.textContent).toContain('Worker')
  })

  it('version string is present in center zone', () => {
    render(<BottomStatusBar />)
    const footer = screen.getByTestId('bottom-bar') as HTMLElement
    expect(footer.textContent).toContain('v0.1.0-demo')
  })
})
