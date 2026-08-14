import { useTranslation } from 'react-i18next'
import { usePreferenceStore } from '../../stores/preferencesStore'
import { IS_DEMO_MODE } from '../../lib/api'
import { Settings, Moon, Sun, Globe } from 'lucide-react'
import { useState } from 'react'
import SettingsDialog from './SettingsDialog'
import logoUrl from '../../../Images/logo.png'
import brandImageUrl from '../../../Images/text.png'
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
        <header data-testid="top-bar" className="flex items-center justify-between px-4 h-[34px] bg-background topbar-header">
          <div className="flex items-center gap-[10px]">
            <div
              data-testid="topbar-logo-chip"
              aria-label={t('topbar.logoAlt')}
              className="chip-tile flex items-center"
            >
              <img src={logoUrl} alt="" className="w-6 h-6 object-contain" />
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
          <div className="flex items-center justify-center absolute inset-x-0 pointer-events-none">
            <div
              data-testid="brand-glow"
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                height: '48px',
                background: theme === 'dark'
                  ? 'radial-gradient(ellipse 60% 120% at center, rgba(227,165,95,0.28) 0%, rgba(227,165,95,0.08) 50%, transparent 72%)'
                  : 'radial-gradient(ellipse 60% 120% at center, rgba(146,64,14,0.18) 0%, rgba(146,64,14,0.06) 50%, transparent 72%)',
              }}
              aria-hidden="true"
            />
            <img
              src={brandImageUrl}
              alt={t('topbar.brandAlt')}
              className="h-[34px] w-auto opacity-90 relative z-10"
            />
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
              <TooltipContent side="bottom" forceMount>
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
              <TooltipContent side="bottom" forceMount>
                <p>{language === 'en' ? t('actions.langTooltipEn') : t('actions.langTooltipId')}</p>
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
              <TooltipContent side="bottom" forceMount>
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
