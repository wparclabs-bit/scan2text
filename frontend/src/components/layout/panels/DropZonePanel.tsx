import FileDropZone from '@/components/dropzone/FileDropZone'
import { useTranslation } from 'react-i18next'
import { usePreferenceStore } from '@/stores/preferencesStore'
import { getDepthStyle } from '@/lib/depthStyles'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function DropZonePanel() {
  const { t } = useTranslation()
  const theme = usePreferenceStore((s) => s.theme)
  const depthStyle = getDepthStyle({ theme, panel: 'left' })

  return (
    <div data-testid="panel-dropzone" className="flex flex-col h-full">
        <div className="flex-1 rounded-xl overflow-hidden flex flex-col min-w-0 box-border" style={depthStyle}>
        <ScrollArea data-testid="dropzone-scroll-area" className="flex-1">
          <div className="flex flex-col items-center justify-center gap-3 p-4">
            <p className="text-base font-display font-semibold text-foreground text-center">
              {t('dropzone.clickLabel')}
            </p>
            <FileDropZone />
          </div>
        </ScrollArea>
        <p data-testid="dropzone-hint" className="text-xs text-muted-foreground text-center px-4 py-3 mt-auto">
          {t('dropzone.hint')}
        </p>
      </div>
    </div>
  )
}
