import { useTranslation } from 'react-i18next'

export default function BottomStatusBar() {
  const { t } = useTranslation()

  return (
    <footer data-testid="bottom-bar" className="px-4 py-1 border-t text-sm text-muted-foreground">
      <div className="flex items-center justify-between gap-4">
        <span>{t('bottomBar.workerIdle')}</span>
        <span className="h-px w-px bg-border" aria-hidden="true" />
        <span>{t('bottomBar.ramUsage')}</span>
        <span className="h-px w-px bg-border" aria-hidden="true" />
        <span>{t('bottomBar.version')}</span>
      </div>
    </footer>
  )
}
