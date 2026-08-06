import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

export { i18n }

export function initI18n(resources: Record<string, { translation: Record<string, unknown> }>): typeof i18n {
  i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })

  return i18n
}
