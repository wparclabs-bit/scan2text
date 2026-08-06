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
})
