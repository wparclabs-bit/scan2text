import { useTranslation } from 'react-i18next'
import { useScan2TextStore } from '@/stores/scan2text.store'
import { usePreferenceStore } from '@/stores/preferencesStore'
import { formatBytes } from '@/lib/formatBytes'
import { fileKind } from '@/lib/fileKind'
import { useMemo, useState } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getDepthStyle } from '@/lib/depthStyles'
import { FileImage, FileText } from 'lucide-react'

export default function QueuePanel() {
  const { t } = useTranslation()
  const jobsRef = useScan2TextStore((s) => s.jobs)
  const selectedJobId = useScan2TextStore((s) => s.selectedJobId)
  const retryJob = useScan2TextStore((s) => s.retryJob)
  const theme = usePreferenceStore((s) => s.theme)
  const depthStyle = getDepthStyle({ theme, panel: 'center' })

  const [isRetrying, setIsRetrying] = useState<string | null>(null)

  const jobList = useMemo(() => {
    const values = Object.values(jobsRef)
    return values.sort((a, b) => a.createdAt - b.createdAt)
  }, [jobsRef])

  if (jobList.length === 0) {
    return (
      <div data-testid="panel-queue" className="h-full">
        <div className="rounded-xl p-4 h-full flex items-center min-w-0 box-border overflow-hidden" style={depthStyle}>
          <p data-testid="queue-empty" className="text-sm text-muted-foreground">
            {t('queue.empty')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="panel-queue" className="h-full">
      <div className="rounded-xl p-3 h-full flex flex-col gap-2 min-w-0 box-border overflow-hidden" style={depthStyle}>
        {jobList.map((job) => {
          const isSelected = selectedJobId === job.id
          const isRetryingThis = isRetrying === job.id
          const isActive = job.status === 'uploading' || job.status === 'processing'
          const kind = fileKind(job.fileName)
          return (
            <div
              key={job.id}
              data-testid="queue-item"
              className={`flex items-center gap-3 p-2 rounded-lg ${isSelected ? 'bg-accent/10' : ''}`}
            >
              <div className="w-10 h-10 shrink-0 rounded overflow-hidden bg-muted flex items-center justify-center">
                {kind === 'image' ? (
                  <FileImage
                    data-testid="queue-icon-image"
                    className="w-6 h-6 text-foreground"
                    aria-hidden="true"
                  />
                ) : kind === 'pdf' ? (
                  <FileText
                    data-testid="queue-icon-pdf"
                    className="w-6 h-6 text-destructive"
                    aria-hidden="true"
                  />
                ) : (
                  <FileText
                    data-testid="queue-icon-pdf"
                    className="w-6 h-6 text-foreground"
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p data-testid="queue-item-name" className="text-sm font-medium truncate">
                  {job.fileName}
                </p>
                <p data-testid="queue-item-size" className="text-xs text-muted-foreground">
                  {formatBytes(job.fileSize)}
                </p>
                {isActive && (
                  <div className="mt-1 flex items-center gap-2">
                    <Spinner className="size-3 text-primary" />
                    <div
                      data-testid="queue-item-progress"
                      className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden"
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${job.progress ?? 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              {job.status === 'completed' && (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        data-testid="queue-item-status-dot"
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: 'radial-gradient(circle at 35% 35%, #86efac, #16a34a)' }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{t('queue.status.completed')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {job.status === 'failed' && (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        data-testid="queue-item-status-dot"
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: 'radial-gradient(circle at 35% 35%, #fca5a5, #dc2626)' }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{t('queue.status.failed')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {(job.status === 'pending' || job.status === 'uploading' || job.status === 'processing') && (
                <span
                  data-testid="queue-item-status"
                  className="text-xs text-muted-foreground capitalize shrink-0"
                >
                  {t(`queue.status.${job.status}`)}
                </span>
              )}
              {job.status === 'failed' && (
                <button
                  data-testid="queue-item-retry"
                  onClick={async () => {
                    setIsRetrying(job.id)
                    try {
                      await retryJob(job.id)
                    } finally {
                      setIsRetrying(null)
                    }
                  }}
                  disabled={isRetryingThis}
                  className="text-xs text-primary hover:text-foreground shrink-0 disabled:opacity-50"
                  title={t('queue.retry')}
                >
                  {t('queue.retry')}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
