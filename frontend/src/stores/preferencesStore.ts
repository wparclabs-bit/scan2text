import { create } from 'zustand'
import { i18n } from '../i18n'
import { saveSettings } from '../lib/api'
import {
  THEME_KEY,
  LANGUAGE_KEY,
  type Theme,
  type Language,
  getInitialTheme,
  getInitialLanguage,
  getStoredLanguage,
} from '../lib/preferences'

/* ── debounce helpers (module-level, not in Zustand state) ─────────── */

let themeDebounceTimer: ReturnType<typeof setTimeout> | null = null
let langDebounceTimer: ReturnType<typeof setTimeout> | null = null

const DEBOUNCE_MS = 800

function scheduleThemeSave(theme: Theme): void {
  if (themeDebounceTimer) clearTimeout(themeDebounceTimer)
  themeDebounceTimer = setTimeout(() => {
    void saveSettings({ theme })
    themeDebounceTimer = null
  }, DEBOUNCE_MS)
}

function scheduleLangSave(language: Language): void {
  if (langDebounceTimer) clearTimeout(langDebounceTimer)
  langDebounceTimer = setTimeout(() => {
    void saveSettings({ language })
    langDebounceTimer = null
  }, DEBOUNCE_MS)
}

interface PreferencesState {
  theme: Theme
  language: Language
  hydratePreferences: (storage?: Storage, browserLanguage?: string) => void
  setTheme: (theme: Theme, storage?: Storage) => void
  toggleTheme: (storage?: Storage) => void
  setLanguage: (language: Language, storage?: Storage) => Promise<void>
  toggleLanguage: (storage?: Storage) => Promise<void>
  applySettingsFromResponse: (response: { theme?: Theme; language?: Language }) => Promise<void>
}

export const usePreferenceStore = create<PreferencesState>((set) => ({
  theme: 'dark',
  language: 'en',

  hydratePreferences: (storage, browserLanguage) => {
    const theme = getInitialTheme(storage)
    const language = getInitialLanguage(storage, browserLanguage)
    set({ theme, language })

    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // Call i18n when localStorage has a saved language (not browser-detection path)
    const stored = getStoredLanguage(storage)
    if (stored !== null) {
      void i18n.changeLanguage(stored)
    }
  },

  setTheme: (theme, storage) => {
    const target = storage ?? window.localStorage
    set(() => {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      target.setItem(THEME_KEY, theme)
      return { theme }
    })
  },

  toggleTheme: (storage) => {
    const target = storage ?? window.localStorage
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark'
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      target.setItem(THEME_KEY, newTheme)
      return { theme: newTheme }
    })
    scheduleThemeSave(usePreferenceStore.getState().theme)
  },

  setLanguage: async (language, storage) => {
    await i18n.changeLanguage(language)
    const target = storage ?? window.localStorage
    set(() => {
      target.setItem(LANGUAGE_KEY, language)
      return { language }
    })
  },

  toggleLanguage: async (storage) => {
    const target = storage ?? window.localStorage
    set((state) => {
      const newLanguage = state.language === 'en' ? 'id' : 'en'
      target.setItem(LANGUAGE_KEY, newLanguage)
      return { language: newLanguage }
    })
    await i18n.changeLanguage(usePreferenceStore.getState().language)
    scheduleLangSave(usePreferenceStore.getState().language)
  },

  applySettingsFromResponse: async (response) => {
    const { theme, language } = response
    if (theme !== undefined) {
      set(() => {
        if (theme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
        return { theme }
      })
    }
    if (language !== undefined) {
      set({ language })
      await i18n.changeLanguage(language)
    }
  },
}))

export function getTestPreferenceStore() {
  return usePreferenceStore
}
