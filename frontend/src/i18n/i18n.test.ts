import { describe, it, expect, beforeEach } from 'vitest'

const enResources = {
  app: { title: 'Scan2Text' },
  panels: { dropZone: 'Drop Zone', queue: 'Queue', preview: 'Preview' },
  status: { ready: 'Ready' },
  actions: { toggleTheme: 'Toggle theme', toggleLanguage: 'Toggle language' },
}

const idResources = {
  app: { title: 'Scan2Text' },
  panels: { dropZone: 'Zona Jatuh', queue: 'Antrian', preview: 'Pratinjau' },
  status: { ready: 'Siap' },
  actions: { toggleTheme: 'Ubah tema', toggleLanguage: 'Ubah bahasa' },
}

describe('i18n initialization', () => {
  beforeEach(async () => {
    const i18next = await import('i18next')
    i18next.default.use(await import('react-i18next').then(m => m.initReactI18next))
    await i18next.default.init({
      resources: {
        en: { translation: enResources },
        id: { translation: idResources },
      },
      lng: 'en',
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
    })
  })

  it('initializes with English fallback', async () => {
    const i18next = await import('i18next')
    expect(i18next.default.language).toBe('en')
    expect(i18next.default.options.fallbackLng).toEqual(['en'])
  })

  it('can change language to "id"', async () => {
    const i18next = await import('i18next')
    await i18next.default.changeLanguage('id')
    expect(i18next.default.language).toBe('id')
  })

  it('translated app.title exists in English', async () => {
    const i18next = await import('i18next')
    expect(i18next.default.t('app.title')).toBe('Scan2Text')
  })

  it('translated panels.queue exists in Indonesian', async () => {
    const i18next = await import('i18next')
    await i18next.default.changeLanguage('id')
    expect(i18next.default.t('panels.queue')).toBe('Antrian')
  })
})
