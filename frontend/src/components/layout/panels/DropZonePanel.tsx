import FileDropZone from '@/components/dropzone/FileDropZone'
import { useTranslation } from 'react-i18next'

export default function DropZonePanel() {
  const { t } = useTranslation()

  return (
    <div data-testid="panel-dropzone" className="flex flex-col h-full">
      <div className="flex-1 surface-left rounded-xl overflow-hidden flex flex-col min-w-0 box-border">
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
          <p className="text-base font-display font-semibold text-foreground text-center">
            {t('dropzone.clickLabel')}
          </p>
          <FileDropZone />
        </div>
        <p data-testid="dropzone-hint" className="text-xs text-muted-foreground text-center px-4 py-3 mt-auto border-t border-border/50">
          {t('dropzone.hint')}
        </p>
      </div>
    </div>
  )
}
