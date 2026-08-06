import { create } from 'zustand'
import { i18n } from '../i18n'
import {
  THEME_KEY,
  LANGUAGE_KEY,
  type Theme,
  type Language,
  getInitialTheme,
  getInitialLanguage,
} from '../lib/preferences'

interface PreferencesState {
  theme: Theme
  language: Language
  hydratePreferences: (storage?: Storage, browserLanguage?: string) => void
  setTheme: (theme: Theme, storage?: Storage) => void
  toggleTheme: (storage?: Storage) => void
  setLanguage: (language: Language, storage?: Storage) => Promise<void>
  toggleLanguage: (storage?: Storage) => Promise<void>
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
  },

  setTheme: (theme, storage) => {
    set(() => {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      storage?.setItem(THEME_KEY, theme)
      return { theme }
    })
  },

  toggleTheme: (storage) => {
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark'
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      storage?.setItem(THEME_KEY, newTheme)
      return { theme: newTheme }
    })
  },

  setLanguage: async (language, storage) => {
    await i18n.changeLanguage(language)
    set(() => {
      storage?.setItem(LANGUAGE_KEY, language)
      return { language }
    })
  },

  toggleLanguage: async (storage) => {
    set((state) => {
      const newLanguage = state.language === 'en' ? 'id' : 'en'
      storage?.setItem(LANGUAGE_KEY, newLanguage)
      return { language: newLanguage }
    })
    await i18n.changeLanguage(usePreferenceStore.getState().language)
  },
}))

export function getTestPreferenceStore() {
  return usePreferenceStore
}
