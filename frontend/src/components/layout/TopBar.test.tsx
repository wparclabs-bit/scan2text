import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TopBar from './TopBar'

const mockToggleTheme = vi.fn()
const mockToggleLanguage = vi.fn()

let mockState = {
  theme: 'dark',
  language: 'en',
  toggleTheme: mockToggleTheme,
  toggleLanguage: mockToggleLanguage,
}

vi.mock('../../stores/preferencesStore', () => {
  const store = {
    getState: () => mockState,
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const useStore = (selector: any) => selector(store.getState())
  useStore.getState = store.getState.bind(store)
  return { usePreferenceStore: useStore }
})

describe('TopBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState = {
      theme: 'dark',
      language: 'en',
      toggleTheme: mockToggleTheme,
      toggleLanguage: mockToggleLanguage,
    }
  })

  it('renders settings trigger button with data-testid="settings-trigger"', () => {
    render(<TopBar />)
    expect(screen.getByTestId('settings-trigger')).toBeInTheDocument()
  })

  it('clicking settings trigger opens the SettingsDialog', () => {
    render(<TopBar />)
    fireEvent.click(screen.getByTestId('settings-trigger'))
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('does not open dialog on other button clicks', () => {
    render(<TopBar />)
    fireEvent.click(screen.getByTestId('theme-toggle'))
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('renders logo chip with data-testid="topbar-logo-chip"', () => {
    render(<TopBar />)
    expect(screen.getByTestId('topbar-logo-chip')).toBeInTheDocument()
  })

  it('logo chip uses logo.png image', () => {
    render(<TopBar />)
    const img = screen.getByTestId('topbar-logo-chip').querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img?.src).toContain('logo.png')
  })

  it('renders live-text wordmark with data-testid="topbar-wordmark"', () => {
    render(<TopBar />)
    expect(screen.getByTestId('topbar-wordmark')).toBeInTheDocument()
  })

  it('wordmark accent digit "2" has data-testid="topbar-wordmark-accent"', () => {
    render(<TopBar />)
    expect(screen.getByTestId('topbar-wordmark-accent')).toBeInTheDocument()
  })

  it('DEMO badge exists with data-testid="topbar-demo-badge"', () => {
    render(<TopBar />)
    expect(screen.getByTestId('topbar-demo-badge')).toBeInTheDocument()
  })

  it('wordmark uses display font styling', () => {
    render(<TopBar />)
    const wordmark = screen.getByTestId('topbar-wordmark')
    expect(wordmark).toHaveClass('font-display')
  })

  it('logo has accessible aria-label', () => {
    render(<TopBar />)
    const logoChip = screen.getByTestId('topbar-logo-chip')
    expect(logoChip).toHaveAttribute('aria-label', 'Scan2Text logo')
  })
})
