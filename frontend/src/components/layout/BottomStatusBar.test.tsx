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
          case 'bottomBar.cpuUsage':
            return 'CPU: —'
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
    // Final product: shipped version is v1.0.0
    expect(footer.textContent).toContain('v1.0.0')
  })

  it('shows RAM value from health endpoint instead of dash', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ram: { percent: 42.5 } }),
    }))
    ;(useTranslation as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      t: (key: string, vars?: Record<string, unknown>) => {
        if (key === 'bottomBar.workerLabel') return `Worker: Idle`
        if (key === 'bottomBar.ramUsage') return `RAM: ${vars?.percent ?? '—'}%`
        if (key === 'actions.shareTooltip') return 'Share app link'
        return key
      },
    })
    render(<BottomStatusBar />)
    await new Promise((r) => setTimeout(r, 50))
    const footer = screen.getByTestId('bottom-bar') as HTMLElement
    expect(footer.textContent).not.toContain('RAM: —')
  })

  it('renders CPU percent from health endpoint', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ cpu: { percent: 27 } }),
    }))
    ;(useTranslation as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      t: (key: string, vars?: Record<string, unknown>) => {
        if (key === 'bottomBar.workerLabel') return `Worker: Idle`
        if (key === 'bottomBar.ramUsage') return `RAM: ${vars?.percent ?? '—'}%`
        if (key === 'bottomBar.cpuUsage') return `CPU: ${vars?.percent ?? '—'}%`
        if (key === 'actions.shareTooltip') return 'Share app link'
        return key
      },
    })
    render(<BottomStatusBar />)
    await new Promise((r) => setTimeout(r, 50))
    const footer = screen.getByTestId('bottom-bar') as HTMLElement
    expect(footer.textContent).toContain('CPU: 27%')
  })
})
