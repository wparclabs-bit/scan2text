import FileDropZone from '@/components/dropzone/FileDropZone'
import { useTranslation } from 'react-i18next'

export default function DropZonePanel() {
  const { t } = useTranslation()

  return (
    <div data-testid="panel-dropzone" className="flex flex-col items-center justify-center p-4 gap-4 min-h-full">
      <FileDropZone />
      <p data-testid="dropzone-hint" className="text-xs text-muted-foreground text-center">
        {t('dropzone.hint')}
      </p>
    </div>
  )
}
