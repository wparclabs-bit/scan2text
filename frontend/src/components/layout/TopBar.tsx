import { useTranslation } from 'react-i18next'
import { usePreferenceStore } from '../../stores/preferencesStore'
import { IS_DEMO_MODE } from '../../lib/api'
import { Settings } from 'lucide-react'
import { useState } from 'react'
import SettingsDialog from './SettingsDialog'

export default function TopBar() {
  const { t } = useTranslation()
  const toggleTheme = usePreferenceStore((state) => state.toggleTheme)
  const toggleLanguage = usePreferenceStore((state) => state.toggleLanguage)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
      <header data-testid="top-bar" className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">{t('app.title')}</h1>
          {IS_DEMO_MODE && (
            <span
              data-testid="demo-badge"
              className="bg-amber-500/20 text-amber-500 border border-amber-500/50 px-2 py-0.5 rounded-full text-xs font-bold"
            >
              {t('demo.badge')}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button data-testid="theme-toggle" onClick={() => toggleTheme()}>
            {t('actions.toggleTheme')}
          </button>
          <button data-testid="language-toggle" onClick={() => toggleLanguage()}>
            {t('actions.toggleLanguage')}
          </button>
          <button
            data-testid="settings-trigger"
            onClick={() => setSettingsOpen(true)}
            aria-label={t('settings.title')}
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}
