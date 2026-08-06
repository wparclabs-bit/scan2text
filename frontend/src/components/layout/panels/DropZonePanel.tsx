import FileDropZone from '@/components/dropzone/FileDropZone'
import { useTranslation } from 'react-i18next'

export default function DropZonePanel() {
  const { t } = useTranslation()

  return (
    <div data-testid="panel-dropzone" className="flex flex-col h-full">
      <div className="flex-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <FileDropZone />
      </div>
      <p data-testid="dropzone-hint" className="text-xs text-muted-foreground text-center mt-2">
        {t('dropzone.hint')}
      </p>
    </div>
  )
}
