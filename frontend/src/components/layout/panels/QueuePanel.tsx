import { useTranslation } from 'react-i18next'
import { useScan2TextStore } from '@/stores/scan2text.store'
import { formatBytes } from '@/lib/formatBytes'
import { useMemo, useState } from 'react'

export default function QueuePanel() {
  const { t } = useTranslation()
  const jobsRef = useScan2TextStore((s) => s.jobs)
  const selectedJobId = useScan2TextStore((s) => s.selectedJobId)
  const removeJob = useScan2TextStore((s) => s.removeJob)
  const retryJob = useScan2TextStore((s) => s.retryJob)
  const setSelectedJobId = useScan2TextStore((s) => s.setSelectedJobId)

  const [isRetrying, setIsRetrying] = useState<string | null>(null)

  const jobList = useMemo(() => {
    const values = Object.values(jobsRef)
    return values.sort((a, b) => a.createdAt - b.createdAt)
  }, [jobsRef])

  if (jobList.length === 0) {
    return (
      <div data-testid="panel-queue" className="p-4">
        <p data-testid="queue-empty" className="text-sm text-muted-foreground">
          {t('queue.empty')}
        </p>
      </div>
    )
  }

  return (
    <div data-testid="panel-queue" className="p-4 flex flex-col gap-2">
      {jobList.map((job) => {
        const isSelected = selectedJobId === job.id
        const isRetryingThis = isRetrying === job.id
        return (
          <div
            key={job.id}
            data-testid="queue-item"
            className={`flex items-center gap-3 p-2 rounded border ${isSelected ? 'border-primary' : 'border-muted'}`}
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
              {job.status === 'processing' && (
                <div className="mt-1">
                  <div
                    data-testid="queue-item-progress"
                    className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${job.progress ?? 0}%` }}
                    />
                  </div>
                  <p data-testid="queue-item-progress-text" className="text-xs text-muted-foreground mt-0.5">
                    {job.progress ?? 0}%
                  </p>
                </div>
              )}
            </div>
            <span
              data-testid="queue-item-status"
              className={`text-xs px-2 py-0.5 rounded-full ${
                job.status === 'completed'
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                  : job.status === 'failed'
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                    : job.status === 'processing'
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : 'bg-muted-foreground/10 text-muted-foreground'
              }`}
            >
              {t(`queue.status.${job.status}`)}
            </span>
            <button
              data-testid="queue-item-remove"
              onClick={() => {
                removeJob(job.id)
                if (selectedJobId === job.id) {
                  setSelectedJobId(null)
                }
              }}
              className="text-xs text-muted-foreground hover:text-foreground shrink-0"
              title={t('queue.remove')}
            >
              {t('queue.remove')}
            </button>
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
  )
}
