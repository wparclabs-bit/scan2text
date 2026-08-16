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
      t: (key: string, vars?: Record<string, unknown>) => {
        switch (key) {
          case 'bottomBar.workerLabel':
            return `Worker: ${vars?.status ?? 'Idle'}`
          case 'bottomBar.ramUsage':
            return `RAM: ${vars?.percent != null ? `${vars.percent}%` : '—'}`
          case 'bottomBar.cpuUsage':
            return `CPU: ${vars?.percent != null ? `${vars.percent}%` : '—'}`
          case 'actions.shareTooltip':
            return 'Share app link'
          default:
            // Always return the fallback format to simulate missing i18n key
            if (key.includes('ramUsage')) return `RAM: —%`
            if (key.includes('cpuUsage')) return `CPU: —%`
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
        switch (key) {
          case 'bottomBar.workerLabel':
            return `Worker: Idle`
          case 'bottomBar.ramUsage':
            return `RAM: ${vars?.percent ?? '—'}%`
          case 'bottomBar.cpuUsage':
            return `CPU: ${vars?.percent ?? '—'}%`
          case 'actions.shareTooltip':
            return 'Share app link'
          default:
            // Always return the fallback format to simulate missing i18n key
            if (key.includes('ramUsage')) return `RAM: —%`
            if (key.includes('cpuUsage')) return `CPU: —%`
            return key
        }
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
        switch (key) {
          case 'bottomBar.workerLabel':
            return `Worker: Idle`
          case 'bottomBar.ramUsage':
            return `RAM: ${vars?.percent ?? '—'}%`
          case 'bottomBar.cpuUsage':
            return `CPU: ${vars?.percent ?? '—'}%`
          case 'actions.shareTooltip':
            return 'Share app link'
          default:
            // Always return the fallback format to simulate missing i18n key
            if (key.includes('ramUsage')) return `RAM: —%`
            if (key.includes('cpuUsage')) return `CPU: —%`
            return key
        }
      },
    })
    render(<BottomStatusBar />)
    await new Promise((r) => setTimeout(r, 50))
    const footer = screen.getByTestId('bottom-bar') as HTMLElement
    expect(footer.textContent).toContain('CPU: 27%')
  })

  it('renders "—" for RAM when /api/health fails (telemetry fallback)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    ;(useTranslation as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      t: (key: string, vars?: Record<string, unknown>) => {
        switch (key) {
          case 'bottomBar.workerLabel':
            return `Worker: Idle`
          case 'bottomBar.ramUsage':
            return `RAM: ${vars?.percent != null ? `${vars.percent}%` : '—'}`
          case 'bottomBar.cpuUsage':
            return `CPU: ${vars?.percent != null ? `${vars.percent}%` : '—'}`
          case 'actions.shareTooltip':
            return 'Share app link'
          default:
            // Always return the fallback format to simulate missing i18n key
            if (key.includes('ramUsage')) return `RAM: —%`
            if (key.includes('cpuUsage')) return `CPU: —%`
            return key
        }
      },
    })
    render(<BottomStatusBar />)
    await new Promise((r) => setTimeout(r, 50))
    const footer = screen.getByTestId('bottom-bar') as HTMLElement
    expect(footer.textContent).toContain('—')
    expect(footer.textContent).not.toContain('{{percent}}')
  })

  it('renders "—" for CPU when /api/health fails (telemetry fallback)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    ;(useTranslation as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      t: (key: string, vars?: Record<string, unknown>) => {
        switch (key) {
          case 'bottomBar.workerLabel':
            return `Worker: Idle`
          case 'bottomBar.ramUsage':
            return `RAM: ${vars?.percent != null ? `${vars.percent}%` : '—'}`
          case 'bottomBar.cpuUsage':
            return `CPU: ${vars?.percent != null ? `${vars.percent}%` : '—'}`
          case 'actions.shareTooltip':
            return 'Share app link'
          default:
            // Always return the fallback format to simulate missing i18n key
            if (key.includes('ramUsage')) return `RAM: —%`
            if (key.includes('cpuUsage')) return `CPU: —%`
            return key
        }
      },
    })
    render(<BottomStatusBar />)
    await new Promise((r) => setTimeout(r, 50))
    const footer = screen.getByTestId('bottom-bar') as HTMLElement
    expect(footer.textContent).toContain('—')
    expect(footer.textContent).not.toContain('{{percent}}')
  })

  it('does NOT render literal "{{percent}}" when health fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    ;(useTranslation as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      t: (key: string, vars?: Record<string, unknown>) => {
        switch (key) {
          case 'bottomBar.workerLabel':
            return `Worker: Idle`
          case 'bottomBar.ramUsage':
            return `RAM: ${vars?.percent != null ? `${vars.percent}%` : '—'}`
          case 'bottomBar.cpuUsage':
            return `CPU: ${vars?.percent != null ? `${vars.percent}%` : '—'}`
          case 'actions.shareTooltip':
            return 'Share app link'
          default:
            // Always return the fallback format to simulate missing i18n key
            if (key.includes('ramUsage')) return `RAM: —%`
            if (key.includes('cpuUsage')) return `CPU: —%`
            return key
        }
      },
    })
    render(<BottomStatusBar />)
    await new Promise((r) => setTimeout(r, 50))
    const footer = screen.getByTestId('bottom-bar') as HTMLElement
    expect(footer.textContent).not.toContain('{{percent}}')
    expect(footer.textContent).toContain('—')
  })
})
