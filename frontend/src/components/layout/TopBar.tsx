import { useTranslation } from 'react-i18next'
import { usePreferenceStore } from '../../stores/preferencesStore'
import { IS_DEMO_MODE } from '../../lib/api'
import { Settings, Moon, Sun, Globe } from 'lucide-react'
import { useState } from 'react'
import SettingsDialog from './SettingsDialog'
import logoUrl from '../../../Images/logo.png'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'

export default function TopBar() {
  const { t } = useTranslation()
  const toggleTheme = usePreferenceStore((state) => state.toggleTheme)
  const toggleLanguage = usePreferenceStore((state) => state.toggleLanguage)
  const theme = usePreferenceStore((state) => state.theme)
  const language = usePreferenceStore((state) => state.language)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <TooltipProvider delayDuration={200}>
      <>
        <header data-testid="top-bar" className="flex items-center justify-between px-4 py-2 bg-background topbar-header">
          <div className="flex items-center gap-[10px]">
            <div
              data-testid="topbar-logo-chip"
              aria-label={t('topbar.logoAlt')}
              className="chip-tile flex items-center"
            >
              <img src={logoUrl} alt="" className="w-6 h-6 object-contain" />
              <span data-testid="topbar-wordmark" className="text-lg font-semibold font-display tracking-wider">
                <span>{t('topbar.wordmarkScan')}</span>
                <span data-testid="topbar-wordmark-accent" className="text-accent">{t('topbar.wordmarkTwo')}</span>
                <span>{t('topbar.wordmarkText')}</span>
              </span>
            </div>
            {IS_DEMO_MODE && (
              <span
                data-testid="topbar-demo-badge"
                className="bg-amber-500/20 text-amber-500 border border-amber-500/50 px-2 py-0.5 rounded-full text-xs font-bold font-display"
              >
                {t('topbar.demoBadge')}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  data-testid="theme-toggle"
                  onClick={() => toggleTheme()}
                  aria-label={t('actions.toggleTheme')}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{theme === 'dark' ? t('actions.themeTooltipLight') : t('actions.themeTooltipDark')}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  data-testid="language-toggle"
                  onClick={() => toggleLanguage()}
                  aria-label={t('actions.toggleLanguage')}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors gap-1"
                >
                  <Globe className="h-4 w-4" />
                  <span className="text-xs font-medium leading-none">{language.toUpperCase()}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{language === 'en' ? t('actions.langTooltipId') : t('actions.langTooltipEn')}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  data-testid="settings-trigger"
                  onClick={() => setSettingsOpen(true)}
                  aria-label={t('actions.settingsTooltip')}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{t('actions.settingsTooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </header>
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </>
    </TooltipProvider>
  )
}
