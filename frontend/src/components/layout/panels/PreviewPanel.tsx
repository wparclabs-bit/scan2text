import { useTranslation } from 'react-i18next'
import { useScan2TextStore } from '@/stores/scan2text.store'
import MarkdownPreview from './MarkdownPreview'
import { toast } from 'sonner'

export default function PreviewPanel() {
  const { t } = useTranslation()
  const selectedJobId = useScan2TextStore((s) => s.selectedJobId)
  const jobs = useScan2TextStore((s) => s.jobs)
  const job = selectedJobId ? jobs[selectedJobId] : null

  if (!job) {
    return (
      <div data-testid="panel-preview" className="h-full flex items-center justify-center p-4">
        <p data-testid="preview-empty" className="text-sm text-muted-foreground">
          {t('preview.emptyState')}
        </p>
      </div>
    )
  }

  if (['pending', 'uploading', 'processing'].includes(job.status)) {
    return (
      <div data-testid="panel-preview" className="h-full flex items-center justify-center p-4">
        <p data-testid="preview-processing" className="text-sm text-muted-foreground animate-pulse">
          {t('preview.processing')}
        </p>
      </div>
    )
  }

  if (job.status === 'failed') {
    return (
      <div data-testid="panel-preview" className="h-full flex flex-col items-center justify-center p-4 gap-3">
        <p data-testid="preview-error" className="text-sm font-semibold text-destructive text-center">
          {t('preview.failed')}
        </p>
        {job.error && (
          <p className="text-xs text-muted-foreground text-center max-w-md px-4">
            {job.error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div data-testid="panel-preview" className="h-full w-full flex flex-col overflow-hidden">
      {/* Action Header - Only visible when job is completed */}
      {job.status === 'completed' && (
        <header
          data-testid="preview-action-header"
          className="flex items-center justify-end gap-2 p-3 border-b border-border bg-muted/20 shrink-0"
        >
          <button
            data-testid="preview-copy-btn"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(job.resultMarkdown ?? '')
                toast.success(t('toast.copySuccess'))
              } catch (err) {
                console.error('Failed to copy markdown:', err)
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {t('preview.copyBtn')}
          </button>

          <button
            data-testid="preview-open-folder-btn"
            onClick={() => {
              toast.info(t('toast.openFolderDemo'))
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-secondary/50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            {t('preview.openFolderBtn')}
          </button>
        </header>
      )}

      {/* Markdown Preview - takes full width */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <MarkdownPreview markdown={job.resultMarkdown ?? job.markdownOutput ?? ''} />
      </div>
    </div>
  )
}
