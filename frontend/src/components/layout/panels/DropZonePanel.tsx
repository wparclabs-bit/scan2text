import FileDropZone from '@/components/dropzone/FileDropZone'
import { useTranslation } from 'react-i18next'
import { usePreferenceStore } from '@/stores/preferencesStore'
import { getDepthStyle } from '@/lib/depthStyles'
import { ScrollArea } from '@/components/ui/scroll-area'
import dropzoneBgUrl from '../../../../Images/bacground-left-top-panel.jpg'

export default function DropZonePanel() {
  const { t } = useTranslation()
  const theme = usePreferenceStore((s) => s.theme)
  const depthStyle = getDepthStyle({ theme, panel: 'left' })

  return (
    <div data-testid="panel-dropzone" className="flex flex-col h-full">
        <div className="flex-1 rounded-xl overflow-hidden flex flex-col min-w-0 box-border relative" style={depthStyle}>
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url(${dropzoneBgUrl})`,
              backgroundSize: '100%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              opacity: 0.15,
            }}
          />
          <ScrollArea data-testid="dropzone-scroll-area" className="flex-1 relative z-10">
            <div className="flex flex-col gap-3 p-4 h-full">
              <p className="text-base font-display font-bold text-[#1F150C] text-center shrink-0">
                {t('dropzone.clickLabel')}
              </p>
              <FileDropZone className="flex-1 min-h-0 w-full" />
            </div>
          </ScrollArea>
          <p data-testid="dropzone-hint" className="text-xs text-muted-foreground text-center px-4 py-3 mt-auto relative z-10">
            {t('dropzone.hint')}
          </p>
        </div>
    </div>
  )
}
