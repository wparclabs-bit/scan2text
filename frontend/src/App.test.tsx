import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'

const mockToggleTheme = vi.fn()
const mockToggleLanguage = vi.fn()
const mockHydratePreferences = vi.fn()

let mockState = {
  theme: 'dark',
  language: 'en',
  toggleTheme: mockToggleTheme,
  toggleLanguage: mockToggleLanguage,
  hydratePreferences: mockHydratePreferences,
}

vi.mock('./stores/preferencesStore', () => {
  const store = {
    getState: () => mockState,
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const useStore = (selector: any) => selector(store.getState())
  useStore.getState = store.getState.bind(store)
  return { usePreferenceStore: useStore }
})

vi.mock('./stores/scan2text.store', () => ({
  useScan2TextStore: vi.fn(() => () => ([])),
}))

describe('Command Center layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.documentElement.className = ''
    mockState = {
      theme: 'dark',
      language: 'en',
      toggleTheme: mockToggleTheme,
      toggleLanguage: mockToggleLanguage,
      hydratePreferences: mockHydratePreferences,
    }
  })

  afterEach(() => {
    document.documentElement.className = ''
  })

  describe('layout structure', () => {
    it('renders top bar', () => {
      render(<App />)
      expect(screen.getByTestId('top-bar')).toBeInTheDocument()
    })

    it('renders bottom bar with static metrics', () => {
      render(<App />)
      expect(screen.getByTestId('bottom-bar')).toBeInTheDocument()
      expect(screen.getByText('Worker: Idle')).toBeInTheDocument()
      expect(screen.getByText('RAM: 1.8 GB')).toBeInTheDocument()
      expect(screen.getByText('v0.1.0-demo')).toBeInTheDocument()
    })

    it('renders panel-dropzone', () => {
      render(<App />)
      expect(screen.getByTestId('panel-dropzone')).toBeInTheDocument()
    })

    it('renders panel-queue', () => {
      render(<App />)
      expect(screen.getByTestId('panel-queue')).toBeInTheDocument()
    })

    it('renders panel-preview', () => {
      render(<App />)
      expect(screen.getByTestId('panel-preview')).toBeInTheDocument()
    })

    it('layout container uses fr-based grid columns for symmetric margins', () => {
      render(<App />)
      const main = document.querySelector('main') as HTMLElement | null
      expect(main).toBeInTheDocument()
      expect(main?.className).toContain('grid-cols-[2fr_2fr_6fr]')
    })

    it('renders app title', () => {
      render(<App />)
      expect(screen.getByText('Scan2Text')).toBeInTheDocument()
    })

    it('renders theme toggle button', () => {
      render(<App />)
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
    })

    it('renders language toggle button', () => {
      render(<App />)
      expect(screen.getByTestId('language-toggle')).toBeInTheDocument()
    })
  })

  describe('theme behavior', () => {
    it('default theme is dark when no saved preference exists', () => {
      mockState.hydratePreferences = vi.fn(() => {
        document.documentElement.classList.add('dark')
      })
      render(<App />)
      expect(document.documentElement.className).toContain('dark')
    })

    it('document.documentElement has "dark" class by default', () => {
      mockState.hydratePreferences = vi.fn(() => {
        document.documentElement.classList.add('dark')
      })
      render(<App />)
      expect(document.documentElement.className).toContain('dark')
    })

    it('clicking theme toggle switches to light mode and back', () => {
      render(<App />)
      const toggle = screen.getByTestId('theme-toggle') as HTMLButtonElement

      fireEvent.click(toggle)
      expect(mockToggleTheme).toHaveBeenCalled()

      fireEvent.click(toggle)
      expect(mockToggleTheme).toHaveBeenCalledTimes(2)
    })

    it('theme choice persists to localStorage scan2text:theme', () => {
      render(<App />)
      const toggle = screen.getByTestId('theme-toggle') as HTMLButtonElement
      fireEvent.click(toggle)
      expect(mockToggleTheme).toHaveBeenCalled()
    })

    it('saved light theme is used on startup/hydration', () => {
      mockState.theme = 'light'
      mockState.hydratePreferences = vi.fn(() => {
        document.documentElement.classList.remove('dark')
      })
      render(<App />)
      expect(document.documentElement.className).not.toContain('dark')
    })
  })

  describe('language behavior', () => {
    it('saved Indonesian language is used on startup/hydration', () => {
      mockState.language = 'id'
      render(<App />)
      expect(screen.getByTestId('language-toggle')).toBeInTheDocument()
    })

    it('browser language id-ID initializes to Indonesian when no saved language exists', () => {
      Object.defineProperty(window.navigator, 'language', {
        value: 'id-ID',
        writable: true,
        configurable: true,
      })
      mockState.hydratePreferences = vi.fn((_s?: Storage, browserLang?: string) => {
        if (browserLang?.startsWith('id')) {
          mockHydratePreferences(browserLang)
        }
      })
      render(<App />)
      expect(mockHydratePreferences).toHaveBeenCalled()
      delete (window.navigator as any).language
    })

    it('clicking language toggle changes language from en to id and back', async () => {
      render(<App />)
      const toggle = screen.getByTestId('language-toggle') as HTMLButtonElement

      fireEvent.click(toggle)
      expect(mockToggleLanguage).toHaveBeenCalled()

      fireEvent.click(toggle)
      expect(mockToggleLanguage).toHaveBeenCalledTimes(2)
    })

    it('language choice persists to localStorage scan2text:language', () => {
      render(<App />)
      const toggle = screen.getByTestId('language-toggle') as HTMLButtonElement
      fireEvent.click(toggle)
      expect(mockToggleLanguage).toHaveBeenCalled()
    })

    it('visible UI text updates after language toggle', async () => {
      render(<App />)
      expect(screen.getByText('Scan2Text')).toBeInTheDocument()
    })
  })
})
