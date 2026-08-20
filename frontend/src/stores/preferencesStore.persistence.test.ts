import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

/* ── mock api module (saveSettings) before importing store ─────────── */

const mockSaveSettings = vi.fn().mockResolvedValue(undefined)

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual('../lib/api')
  return {
    ...actual,
    saveSettings: mockSaveSettings,
  }
})

/* ── mock i18n ─────────────────────────────────────────────────────── */

const mockChangeLanguage = vi.hoisted(() => vi.fn())

vi.mock('../i18n', () => ({
  i18n: {
    changeLanguage: mockChangeLanguage,
    language: 'en',
  },
}))

/* ── import store after mocks ──────────────────────────────────────── */

const { getTestPreferenceStore } = await import('./preferencesStore')

/* ── helpers ───────────────────────────────────────────────────────── */

function makeStorage(pairs: Record<string, string | null> = {}): Storage {
  const map = new Map<string, string>()
  for (const [k, v] of Object.entries(pairs)) {
    if (v !== null) map.set(k, v)
  }
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => map.set(key, value)),
    removeItem: vi.fn((key: string) => map.delete(key)),
    clear: vi.fn(() => map.clear()),
    length: map.size,
    key: vi.fn((i: number) => (i < map.size ? [...map.keys()][i] : null)),
  } as unknown as Storage
}

/* ── tests ─────────────────────────────────────────────────────────── */

describe('preferences persistence (FR-09)', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let store: any
  const storage = makeStorage()

  beforeEach(() => {
    vi.clearAllMocks()
    document.documentElement.className = ''
    store = getTestPreferenceStore()
    store.setState({ theme: 'dark', language: 'en' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /* ── toggleTheme persists to localStorage ───────────────────────── */

  describe('toggleTheme persistence', () => {
    it('writes theme to localStorage immediately on toggle', () => {
      store.getState().setTheme('dark')
      store.getState().toggleTheme(storage)
      expect(storage.setItem).toHaveBeenCalledWith('scan2text:theme', 'light')
    })

    it('writes "dark" when toggling from light', () => {
      store.getState().setTheme('light')
      store.getState().toggleTheme(storage)
      expect(storage.setItem).toHaveBeenCalledWith('scan2text:theme', 'dark')
    })
  })

  /* ── toggleLanguage persists to localStorage + i18n ─────────────── */

  describe('toggleLanguage persistence', () => {
    it('writes language to localStorage immediately on toggle', async () => {
      await store.getState().toggleLanguage(storage)
      expect(storage.setItem).toHaveBeenCalledWith('scan2text:language', 'id')
    })

    it('calls i18n.changeLanguage with the new language', async () => {
      await store.getState().toggleLanguage(storage)
      expect(mockChangeLanguage).toHaveBeenCalledWith('id')
    })

    it('writes "en" when toggling from id', async () => {
      await store.getState().setLanguage('id', storage)
      await store.getState().toggleLanguage(storage)
      expect(storage.setItem).toHaveBeenCalledWith('scan2text:language', 'en')
    })
  })

  /* ── hydratePreferences calls i18n.changeLanguage ───────────────── */

  describe('hydratePreferences i18n integration', () => {
    it('calls i18n.changeLanguage when saved language is "id"', () => {
      const saved = makeStorage({ 'scan2text:language': 'id' })
      store.getState().hydratePreferences(saved)
      expect(mockChangeLanguage).toHaveBeenCalledWith('id')
    })

    it('calls i18n.changeLanguage when saved language is "en"', () => {
      const saved = makeStorage({ 'scan2text:language': 'en' })
      store.getState().hydratePreferences(saved)
      expect(mockChangeLanguage).toHaveBeenCalledWith('en')
    })

    it('does NOT call i18n.changeLanguage when no language in storage (browser detection path)', () => {
      const empty = makeStorage()
      store.getState().hydratePreferences(empty, 'en-US')
      expect(mockChangeLanguage).not.toHaveBeenCalled()
    })
  })

  /* ── boot fallback: localStorage empty → apply from GET /api/settings ─ */

  describe('boot fallback from settings.json', () => {
    it('applies theme class when localStorage lacks theme but settings has theme', async () => {
      const empty = makeStorage()

      // Hydrate from empty localStorage (theme falls back to dark default)
      store.getState().hydratePreferences(empty)
      expect(store.getState().theme).toBe('dark') // localStorage empty → default dark

      // Now apply settings from GET /api/settings
      const apply = store.getState().applySettingsFromResponse
      await apply({ output_dir: 'C:\\output', max_pdf_pages: 50, cpu_threads: 0, theme: 'light' })

      // Theme should now be light and .dark class removed
      expect(store.getState().theme).toBe('light')
      expect(document.documentElement.className).not.toContain('dark')
    })

    it('calls i18n.changeLanguage when localStorage lacks language but settings has language', async () => {
      const empty = makeStorage()

      store.getState().hydratePreferences(empty, 'en-US')
      expect(mockChangeLanguage).not.toHaveBeenCalled() // hydration didn't call it (no saved lang)

      const apply = store.getState().applySettingsFromResponse
      await apply({ output_dir: 'C:\\output', max_pdf_pages: 50, cpu_threads: 0, language: 'id' })

      expect(mockChangeLanguage).toHaveBeenCalledWith('id')
      expect(store.getState().language).toBe('id')
    })

    it('applies both theme and language from settings when localStorage is empty', async () => {
      const empty = makeStorage()

      store.getState().hydratePreferences(empty)
      expect(store.getState().theme).toBe('dark') // default
      expect(mockChangeLanguage).not.toHaveBeenCalled()

      const apply = store.getState().applySettingsFromResponse
      await apply({
        output_dir: 'C:\\output',
        max_pdf_pages: 50,
        cpu_threads: 0,
        theme: 'light',
        language: 'id',
      })

      expect(store.getState().theme).toBe('light')
      expect(document.documentElement.className).not.toContain('dark')
      expect(mockChangeLanguage).toHaveBeenCalledWith('id')
      expect(store.getState().language).toBe('id')
    })
  })

  /* ── debounce: rapid toggles produce at most one PUT ─────────────── */

  describe('debounce behavior', () => {
    it('debounces rapid theme toggles — only one saveSettings call within ~1s', async () => {
      vi.useFakeTimers()

      const savedStorage = makeStorage({ 'scan2text:theme': 'dark' })
      store.getState().setTheme('dark')

      // Rapid toggles
      store.getState().toggleTheme(savedStorage)
      store.getState().toggleTheme(savedStorage)
      store.getState().toggleTheme(savedStorage)

      // Before timer fires, saveSettings should NOT have been called yet
      expect(mockSaveSettings).not.toHaveBeenCalled()

      // Advance past debounce window (800ms + small buffer)
      vi.advanceTimersByTime(900)

      // Now exactly one call should have been made
      expect(mockSaveSettings).toHaveBeenCalledTimes(1)

      vi.useRealTimers()
    })

    it('debounces rapid language toggles — only one saveSettings call within ~1s', async () => {
      vi.useFakeTimers()

      const savedStorage = makeStorage({ 'scan2text:language': 'en' })
      store.getState().setLanguage('en')

      // Rapid toggles
      await store.getState().toggleLanguage(savedStorage)
      await store.getState().toggleLanguage(savedStorage)
      await store.getState().toggleLanguage(savedStorage)

      expect(mockSaveSettings).not.toHaveBeenCalled()

      vi.advanceTimersByTime(900)

      expect(mockSaveSettings).toHaveBeenCalledTimes(1)

      vi.useRealTimers()
    })
  })
})
