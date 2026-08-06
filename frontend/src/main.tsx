import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import { initI18n } from './i18n'
import en from './locales/en.json'
import id from './locales/id.json'
import App from './App.tsx'
import { usePreferenceStore } from './stores/preferencesStore'

initI18n({
  en: { translation: en },
  id: { translation: id },
})

usePreferenceStore.getState().hydratePreferences(window.localStorage, navigator.language)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster />
  </StrictMode>,
)
