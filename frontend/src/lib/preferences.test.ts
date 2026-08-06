import { describe, it, expect } from 'vitest'
import {
  THEME_KEY,
  LANGUAGE_KEY,
  detectBrowserLanguage,
  getStoredTheme,
  getStoredLanguage,
  getInitialTheme,
  getInitialLanguage,
} from './preferences'

describe('preference keys', () => {
  it('THEME_KEY is exactly "scan2text:theme"', () => {
    expect(THEME_KEY).toBe('scan2text:theme')
  })

  it('LANGUAGE_KEY is exactly "scan2text:language"', () => {
    expect(LANGUAGE_KEY).toBe('scan2text:language')
  })
})

describe('detectBrowserLanguage', () => {
  it('returns "id" for "id"', () => {
    expect(detectBrowserLanguage('id')).toBe('id')
  })

  it('returns "id" for "id-ID"', () => {
    expect(detectBrowserLanguage('id-ID')).toBe('id')
  })

  it('returns "en" for "en-US"', () => {
    expect(detectBrowserLanguage('en-US')).toBe('en')
  })

  it('returns "en" when undefined', () => {
    expect(detectBrowserLanguage(undefined)).toBe('en')
  })

  it('returns "en" for any other language', () => {
    expect(detectBrowserLanguage('fr-FR')).toBe('en')
  })
})

describe('getStoredTheme', () => {
  it('returns null when storage is empty', () => {
    const storage = { getItem: () => null } as unknown as Storage
    expect(getStoredTheme(storage)).toBeNull()
  })

  it('returns "dark" when saved value is "dark"', () => {
    const storage = { getItem: () => 'dark' } as unknown as Storage
    expect(getStoredTheme(storage)).toBe('dark')
  })

  it('returns "light" when saved value is "light"', () => {
    const storage = { getItem: () => 'light' } as unknown as Storage
    expect(getStoredTheme(storage)).toBe('light')
  })

  it('returns null for invalid saved value', () => {
    const storage = { getItem: () => 'invalid' } as unknown as Storage
    expect(getStoredTheme(storage)).toBeNull()
  })
})

describe('getStoredLanguage', () => {
  it('returns null when storage is empty', () => {
    const storage = { getItem: () => null } as unknown as Storage
    expect(getStoredLanguage(storage)).toBeNull()
  })

  it('returns "en" when saved value is "en"', () => {
    const storage = { getItem: () => 'en' } as unknown as Storage
    expect(getStoredLanguage(storage)).toBe('en')
  })

  it('returns "id" when saved value is "id"', () => {
    const storage = { getItem: () => 'id' } as unknown as Storage
    expect(getStoredLanguage(storage)).toBe('id')
  })

  it('returns null for invalid saved value', () => {
    const storage = { getItem: () => 'invalid' } as unknown as Storage
    expect(getStoredLanguage(storage)).toBeNull()
  })
})

describe('getInitialTheme', () => {
  it('returns "dark" when no saved theme exists', () => {
    const storage = { getItem: () => null } as unknown as Storage
    expect(getInitialTheme(storage)).toBe('dark')
  })

  it('returns "light" when saved value is valid', () => {
    const storage = { getItem: () => 'light' } as unknown as Storage
    expect(getInitialTheme(storage)).toBe('light')
  })

  it('returns "dark" when saved value is invalid', () => {
    const storage = { getItem: () => 'invalid' } as unknown as Storage
    expect(getInitialTheme(storage)).toBe('dark')
  })
})

describe('getInitialLanguage', () => {
  it('returns saved "en" when valid', () => {
    const storage = { getItem: () => 'en' } as unknown as Storage
    expect(getInitialLanguage(storage)).toBe('en')
  })

  it('returns saved "id" when valid', () => {
    const storage = { getItem: () => 'id' } as unknown as Storage
    expect(getInitialLanguage(storage)).toBe('id')
  })

  it('ignores invalid saved language and falls back to browser detection', () => {
    const storage = { getItem: () => 'invalid' } as unknown as Storage
    expect(getInitialLanguage(storage, 'en-US')).toBe('en')
  })

  it('falls back to "en" when no saved value and no browser language', () => {
    const storage = { getItem: () => null } as unknown as Storage
    expect(getInitialLanguage(storage)).toBe('en')
  })

  it('uses browser language when no saved value', () => {
    const storage = { getItem: () => null } as unknown as Storage
    expect(getInitialLanguage(storage, 'id-ID')).toBe('id')
  })
})
