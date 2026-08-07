import { useTranslation } from 'react-i18next'
import { useScan2TextStore } from '@/stores/scan2text.store'
import { formatBytes } from '@/lib/formatBytes'
import { useMemo, useState } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export default function QueuePanel() {
  const { t } = useTranslation()
  const jobsRef = useScan2TextStore((s) => s.jobs)
  const selectedJobId = useScan2TextStore((s) => s.selectedJobId)
  const retryJob = useScan2TextStore((s) => s.retryJob)

  const [isRetrying, setIsRetrying] = useState<string | null>(null)

  const jobList = useMemo(() => {
    const values = Object.values(jobsRef)
    return values.sort((a, b) => a.createdAt - b.createdAt)
  }, [jobsRef])

  if (jobList.length === 0) {
    return (
      <div data-testid="panel-queue" className="h-full">
        <div className="surface-center depth-panel-center rounded-xl p-4 h-full flex items-center min-w-0 box-border">
          <p data-testid="queue-empty" className="text-sm text-muted-foreground">
            {t('queue.empty')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="panel-queue" className="h-full">
      <div className="surface-center depth-panel-center rounded-xl p-3 h-full flex flex-col gap-2 min-w-0 box-border">
        {jobList.map((job) => {
          const isSelected = selectedJobId === job.id
          const isRetryingThis = isRetrying === job.id
          const isActive = job.status === 'uploading' || job.status === 'processing'
          return (
            <div
              key={job.id}
              data-testid="queue-item"
              className={`flex items-center gap-3 p-2 rounded-lg border ${isSelected ? 'border-primary' : 'border-muted'}`}
            >
              <div className="w-10 h-10 shrink-0 rounded overflow-hidden bg-muted flex items-center justify-center">
                <svg
                  data-testid="queue-item-pdf-icon"
                  className="w-6 h-6 text-destructive"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
                  <text x="7" y="17" fontSize="7" fontWeight="bold" fill="currentColor">
                    PDF
                  </text>
                </svg>
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
