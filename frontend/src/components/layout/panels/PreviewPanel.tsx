import { useTranslation } from 'react-i18next'
import { useScan2TextStore } from '@/stores/scan2text.store'
import { usePreferenceStore } from '@/stores/preferencesStore'
import MarkdownPreview from './MarkdownPreview'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { getDepthStyle } from '@/lib/depthStyles'

export default function PreviewPanel() {
  const { t } = useTranslation()
  const selectedJobId = useScan2TextStore((s) => s.selectedJobId)
  const jobs = useScan2TextStore((s) => s.jobs)
  const theme = usePreferenceStore((s) => s.theme)
  const depthStyle = getDepthStyle({ theme, panel: 'right' })
  const job = selectedJobId ? jobs[selectedJobId] : null

  if (!job) {
    return (
      <div data-testid="panel-preview" className="h-full w-full flex flex-col min-h-0 min-w-0 overflow-hidden">
        <div className="flex-1 rounded-xl overflow-hidden flex flex-col min-w-0 box-border items-center justify-center text-center" style={depthStyle}>
          {/* Action Header — always rendered (structural constancy: 0 jobs = same panel structure) */}
          <header
            data-testid="preview-action-header"
            className="flex items-center justify-center gap-2 p-3 shrink-0"
            style={{ backgroundColor: theme === 'dark' ? '#1F150C' : '#EFE9E3' }}
          >
            <button
              data-testid="preview-copy-btn"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText((job as any)?.resultMarkdown ?? '')
                  toast.success(t('toast.copySuccess'))
                } catch (err) {
                  console.error('Failed to copy markdown:', err)
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border-none bg-transparent hover:bg-[rgba(227,165,95,0.12)] hover:text-[#E3A55F] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {t('preview.copyBtn')}
            </button>

            <button
              data-testid="preview-open-folder-btn"
              onClick={() => {
                // In final product, this would open the output folder
                // For now, placeholder behavior
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border-none bg-transparent hover:bg-[rgba(227,165,95,0.12)] hover:text-[#E3A55F] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              {t('preview.openFolderBtn')}
            </button>
          </header>

          <p data-testid="preview-empty" className="text-sm text-muted-foreground p-4">
            {t('preview.emptyState')}
          </p>
        </div>
      </div>
    )
  }

  if (['pending', 'uploading', 'processing'].includes(job.status)) {
    return (
      <div data-testid="panel-preview" className="h-full w-full flex flex-col min-h-0 min-w-0 overflow-hidden">
        <div className="flex-1 rounded-xl overflow-hidden flex flex-col min-w-0 box-border items-center justify-center p-4" style={depthStyle}>
          <p data-testid="preview-processing" className="text-sm text-muted-foreground animate-pulse text-center">
            {t('preview.processing')}
          </p>
        </div>
      </div>
    )
  }

  if (job.status === 'failed') {
    return (
      <div data-testid="panel-preview" className="h-full w-full flex flex-col min-h-0 min-w-0 overflow-hidden">
        <div className="flex-1 rounded-xl overflow-hidden flex flex-col min-w-0 box-border items-center justify-center gap-3 p-4" style={depthStyle}>
          <p data-testid="preview-error" className="text-sm font-semibold text-destructive text-center">
            {t('preview.failed')}
          </p>
          {job.error && (
            <p className="text-xs text-muted-foreground text-center max-w-md px-4">
              {job.error}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div data-testid="panel-preview" className="h-full w-full flex flex-col min-h-0 min-w-0 overflow-hidden">
      <div className="flex-1 rounded-xl flex flex-col min-w-0 box-border overflow-hidden" style={depthStyle}>
        {/* Action Header — always rendered (structural constancy: 0 jobs = same panel structure) */}
        <header
          data-testid="preview-action-header"
          className="flex items-center justify-center gap-2 p-3 shrink-0"
          style={{ backgroundColor: theme === 'dark' ? '#1F150C' : '#EFE9E3' }}
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border-none bg-transparent hover:bg-[rgba(227,165,95,0.12)] hover:text-[#E3A55F] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {t('preview.copyBtn')}
          </button>

          <button
            data-testid="preview-open-folder-btn"
            onClick={() => {
              // In final product, this would open the output folder
              // For now, placeholder behavior
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border-none bg-transparent hover:bg-[rgba(227,165,95,0.12)] hover:text-[#E3A55F] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            {t('preview.openFolderBtn')}
          </button>
        </header>

        {/* Markdown Preview — takes full width below header */}
        <ScrollArea data-testid="preview-scroll-area" className="flex-1">
          <div className="p-4">
            <MarkdownPreview markdown={job.resultMarkdown ?? job.markdownOutput ?? ''} />
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </div>
    </div>
  )
}
