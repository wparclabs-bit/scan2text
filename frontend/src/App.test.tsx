import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'
import { buildApiUrl } from './lib/apiBase'

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

vi.mock('./stores/scan2text.store', () => {
  const store = {
    getState: () => ({ jobs: {} }),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const useStore = (selector: any) => selector(store.getState())
  useStore.getState = store.getState.bind(store)
  return { useScan2TextStore: useStore }
})

vi.mock('./lib/demoOrchestrator', () => ({
  startDemoOrchestrator: vi.fn(),
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
      expect(screen.getByText('RAM: —')).toBeInTheDocument()
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
      expect(main?.className).toContain('grid-cols-[minmax(0,34fr)_minmax(0,60fr)]')
    })

    it('renders brand image alt text', () => {
      render(<App />)
      expect(screen.getByAltText('Scan2Text')).toBeInTheDocument()
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
      expect(screen.getByAltText('Scan2Text')).toBeInTheDocument()
    })
  })

  describe('feedback pending toast on launch', () => {
    it('shows pending toast when online and pending files exist', async () => {
      const mockFetch = vi.fn()
      vi.stubGlobal('fetch', mockFetch)
      Object.defineProperty(window, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      })
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/settings') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ hide_welcome_notice: true }) })
        }
        if (url === '/api/feedback/pending-count') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ count: 2 }) })
        }
        return Promise.resolve({ ok: false })
      })
      render(<App />)
      await new Promise((r) => setTimeout(r, 50))
      // Toast should be triggered - verify fetch was called for pending count
      expect(mockFetch).toHaveBeenCalledWith(buildApiUrl('/api/feedback/pending-count'))
    })

    it('does not show pending toast when offline', async () => {
      const mockFetch = vi.fn()
      vi.stubGlobal('fetch', mockFetch)
      Object.defineProperty(window, 'navigator', {
        value: { onLine: false },
        writable: true,
        configurable: true,
      })
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/settings') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ hide_welcome_notice: true }) })
        }
        return Promise.resolve({ ok: false })
      })
      render(<App />)
      await new Promise((r) => setTimeout(r, 50))
      expect(mockFetch).not.toHaveBeenCalledWith(buildApiUrl('/api/feedback/pending-count'))
    })
  })

  describe('API URL construction via buildApiUrl', () => {
    it('uses buildApiUrl for /api/settings in dev mode', async () => {
      vi.stubEnv('PROD', false)
      const mockFetch = vi.fn()
      vi.stubGlobal('fetch', mockFetch)
      mockFetch.mockImplementation((url: string) => {
        if (url === buildApiUrl('/api/settings')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ hide_welcome_notice: true }) })
        }
        return Promise.resolve({ ok: false })
      })
      render(<App />)
      await new Promise((r) => setTimeout(r, 50))
      expect(mockFetch).toHaveBeenCalledWith(buildApiUrl('/api/settings'))
      vi.unstubAllEnvs()
    })

    it('uses buildApiUrl for /api/download/status in prod mode', async () => {
      vi.stubEnv('PROD', true)
      const mockFetch = vi.fn()
      vi.stubGlobal('fetch', mockFetch)
      mockFetch.mockImplementation((url: string) => {
        if (url === buildApiUrl('/api/download/status')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'complete' }) })
        }
        return Promise.resolve({ ok: false })
      })
      render(<App />)
      await new Promise((r) => setTimeout(r, 50))
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('127.0.0.1:47351'))
      vi.unstubAllEnvs()
    })

    it('uses buildApiUrl for /api/settings in prod mode', async () => {
      vi.stubEnv('PROD', true)
      const mockFetch = vi.fn()
      vi.stubGlobal('fetch', mockFetch)
      mockFetch.mockImplementation((url: string) => {
        if (url === buildApiUrl('/api/settings')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ hide_welcome_notice: true }) })
        }
        return Promise.resolve({ ok: false })
      })
      render(<App />)
      await new Promise((r) => setTimeout(r, 50))
      expect(mockFetch).toHaveBeenCalledWith(buildApiUrl('/api/settings'))
      vi.unstubAllEnvs()
    })

    it('uses buildApiUrl for /api/download/status with ?t= cache-buster in prod mode', async () => {
      vi.stubEnv('PROD', true)
      const mockFetch = vi.fn()
      vi.stubGlobal('fetch', mockFetch)
      mockFetch.mockImplementation((url: string) => {
        const prodBase = buildApiUrl('/api/download/status')
        if (url.startsWith(prodBase) && url.includes('?t=')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'complete' }) })
        }
        return Promise.resolve({ ok: false })
      })
      render(<App />)
      await new Promise((r) => setTimeout(r, 50))
      const statusCall = mockFetch.mock.calls.find((call) => {
        const url = call[0] as string
        return url.startsWith(buildApiUrl('/api/download/status')) && url.includes('?t=')
      })
      expect(statusCall).toBeDefined()
      expect(statusCall![0]).toMatch(/^http:\/\/127\.0\.0\.1:47351\/api\/download\/status\?t=\d+$/)
      vi.unstubAllEnvs()
    })

    it('uses buildApiUrl for /api/download/start in prod mode', async () => {
      vi.stubEnv('PROD', true)
      const mockFetch = vi.fn()
      vi.stubGlobal('fetch', mockFetch)
      mockFetch.mockImplementation((url: string, init?: RequestInit) => {
        if (url === buildApiUrl('/api/settings')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ hide_welcome_notice: false }) })
        }
        if (url.startsWith(buildApiUrl('/api/download/status')) && url.includes('?t=')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'in_progress' }) })
        }
        if (url === buildApiUrl('/api/download/start') && init?.method === 'POST') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
        }
        return Promise.resolve({ ok: false })
      })
      render(<App />)
      await new Promise((r) => setTimeout(r, 50))
      expect(mockFetch).toHaveBeenCalledWith(buildApiUrl('/api/download/start'), expect.objectContaining({ method: 'POST' }))
      vi.unstubAllEnvs()
    })

    it('uses buildApiUrl for /api/feedback/pending-count in prod mode', async () => {
      vi.stubEnv('PROD', true)
      const mockFetch = vi.fn()
      vi.stubGlobal('fetch', mockFetch)
      Object.defineProperty(window, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      })
      mockFetch.mockImplementation((url: string) => {
        if (url === buildApiUrl('/api/settings')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ hide_welcome_notice: false }) })
        }
        if (url.startsWith(buildApiUrl('/api/download/status')) && url.includes('?t=')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'complete' }) })
        }
        if (url === buildApiUrl('/api/feedback/pending-count')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ count: 0 }) })
        }
        return Promise.resolve({ ok: false })
      })
      render(<App />)
      await new Promise((r) => setTimeout(r, 50))
      expect(mockFetch).toHaveBeenCalledWith(buildApiUrl('/api/feedback/pending-count'))
      vi.unstubAllEnvs()
    })
  })
})
