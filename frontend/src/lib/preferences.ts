export const THEME_KEY = 'scan2text:theme'
export const LANGUAGE_KEY = 'scan2text:language'

export type Theme = 'dark' | 'light'
export type Language = 'en' | 'id'

export function detectBrowserLanguage(browserLanguage?: string): Language {
  if (browserLanguage && browserLanguage.startsWith('id')) {
    return 'id'
  }
  return 'en'
}

export function getStoredTheme(storage?: Storage): Theme | null {
  if (!storage) return null
  const value = storage.getItem(THEME_KEY)
  if (value === 'dark' || value === 'light') {
    return value
  }
  return null
}

export function getStoredLanguage(storage?: Storage): Language | null {
  if (!storage) return null
  const value = storage.getItem(LANGUAGE_KEY)
  if (value === 'en' || value === 'id') {
    return value
  }
  return null
}

export function getInitialTheme(storage?: Storage): Theme {
  return getStoredTheme(storage) ?? 'dark'
}

export function getInitialLanguage(storage?: Storage, browserLanguage?: string): Language {
  return getStoredLanguage(storage) ?? detectBrowserLanguage(browserLanguage)
}
