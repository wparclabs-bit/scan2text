import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getTestPreferenceStore } from './preferencesStore'

const mockChangeLanguage = vi.hoisted(() => vi.fn())

vi.mock('../i18n', () => ({
  i18n: {
    changeLanguage: mockChangeLanguage,
    language: 'en',
  },
}))

describe('preferences store', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let store: any

  beforeEach(() => {
    vi.clearAllMocks()
    document.documentElement.className = ''
    store = getTestPreferenceStore()
    store.setState({ theme: 'dark', language: 'en' })
  })

  describe('initial state', () => {
    it('defaults to dark theme before hydration', () => {
      expect(store.getState().theme).toBe('dark')
    })

    it('defaults to en language before hydration', () => {
      expect(store.getState().language).toBe('en')
    })
  })

  describe('hydratePreferences', () => {
    it('uses saved theme from storage', () => {
      const storage = {
        getItem: (key: string) => (key === 'scan2text:theme' ? 'light' : null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      } as unknown as Storage
      store.getState().hydratePreferences(storage)
      expect(store.getState().theme).toBe('light')
    })

    it('uses saved language from storage', () => {
      const storage = {
        getItem: (key: string) => (key === 'scan2text:language' ? 'id' : null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      } as unknown as Storage
      store.getState().hydratePreferences(storage)
      expect(store.getState().language).toBe('id')
    })

    it('detects Indonesian browser language when no saved language exists', () => {
      const storage = {
        getItem: () => null,
        setItem: vi.fn(),
        removeItem: vi.fn(),
      } as unknown as Storage
      store.getState().hydratePreferences(storage, 'id-ID')
      expect(store.getState().language).toBe('id')
    })

    it('falls back to English for non-Indonesian browser language', () => {
      const storage = {
        getItem: () => null,
        setItem: vi.fn(),
        removeItem: vi.fn(),
      } as unknown as Storage
      store.getState().hydratePreferences(storage, 'en-US')
      expect(store.getState().language).toBe('en')
    })

    it('ignores invalid saved theme and uses default dark', () => {
      const storage = {
        getItem: (key: string) => (key === 'scan2text:theme' ? 'invalid' : null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      } as unknown as Storage
      store.getState().hydratePreferences(storage)
      expect(store.getState().theme).toBe('dark')
    })

    it('ignores invalid saved language and falls back to browser detection', () => {
      const storage = {
        getItem: (key: string) => (key === 'scan2text:language' ? 'invalid' : null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      } as unknown as Storage
      store.getState().hydratePreferences(storage, 'en-US')
      expect(store.getState().language).toBe('en')
    })
  })

  describe('setTheme', () => {
    it('updates theme state to light', () => {
      store.getState().setTheme('light')
      expect(store.getState().theme).toBe('light')
    })

    it('adds "dark" class when theme is dark', () => {
      store.getState().setTheme('dark')
      expect(document.documentElement.className).toContain('dark')
    })

    it('removes "dark" class when theme is light', () => {
      store.getState().setTheme('light')
      expect(document.documentElement.className).not.toContain('dark')
    })

    it('persists theme to localStorage scan2text:theme', () => {
      const storage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      } as unknown as Storage
      store.getState().setTheme('light', storage)
      expect(storage.setItem).toHaveBeenCalledWith('scan2text:theme', 'light')
    })
  })

  describe('toggleTheme', () => {
    it('switches from dark to light', () => {
      store.getState().setTheme('dark')
      store.getState().toggleTheme()
      expect(store.getState().theme).toBe('light')
    })

    it('switches from light to dark', () => {
      store.getState().setTheme('light')
      store.getState().toggleTheme()
      expect(store.getState().theme).toBe('dark')
    })

    it('regression: toggling to light removes .dark class so :root light values apply', () => {
      store.getState().setTheme('dark')
      expect(document.documentElement.className).toContain('dark')

      store.getState().toggleTheme()
      expect(document.documentElement.className).not.toContain('dark')
      expect(store.getState().theme).toBe('light')

      store.getState().setTheme('dark')
      expect(document.documentElement.className).toContain('dark')
      expect(store.getState().theme).toBe('dark')
    })
  })

  describe('setLanguage', () => {
    it('updates language state to id', async () => {
      await store.getState().setLanguage('id')
      expect(store.getState().language).toBe('id')
    })

    it('changes i18n language', async () => {
      await store.getState().setLanguage('id')
      expect(mockChangeLanguage).toHaveBeenCalledWith('id')
    })

    it('persists language to localStorage scan2text:language', async () => {
      const storage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      } as unknown as Storage
      await store.getState().setLanguage('id', storage)
      expect(storage.setItem).toHaveBeenCalledWith('scan2text:language', 'id')
    })
  })

  describe('toggleLanguage', () => {
    it('switches from en to id', async () => {
      await store.getState().toggleLanguage()
      expect(store.getState().language).toBe('id')
    })

    it('switches from id to en', async () => {
      await store.getState().setLanguage('id')
      await store.getState().toggleLanguage()
      expect(store.getState().language).toBe('en')
    })
  })
})
