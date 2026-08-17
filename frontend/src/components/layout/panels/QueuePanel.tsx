import { useTranslation } from 'react-i18next'
import { useScan2TextStore } from '@/stores/scan2text.store'
import { usePreferenceStore } from '@/stores/preferencesStore'
import { formatBytes } from '@/lib/formatBytes'
import { fileKind } from '@/lib/fileKind'
import { useMemo, useState } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { getDepthStyle } from '@/lib/depthStyles'
import { FileImage, FileText } from 'lucide-react'

export default function QueuePanel() {
  const { t } = useTranslation()
  const jobsRef = useScan2TextStore((s) => s.jobs)
  const selectedJobId = useScan2TextStore((s) => s.selectedJobId)
  const retryJob = useScan2TextStore((s) => s.retryJob)
  const setSelectedJobId = useScan2TextStore((s) => s.setSelectedJobId)
  const theme = usePreferenceStore((s) => s.theme)
  const depthStyle = getDepthStyle({ theme, panel: 'center' })

  const [isRetrying, setIsRetrying] = useState<string | null>(null)

  const jobList = useMemo(() => {
    const values = Object.values(jobsRef)
    return values.sort((a, b) => a.createdAt - b.createdAt)
  }, [jobsRef])

  if (jobList.length === 0) {
    return (
      <div data-testid="panel-queue" className="h-full min-h-0 min-w-0 w-full">
        <div className="rounded-xl p-4 h-full flex flex-col items-center justify-center text-center min-w-0 box-border overflow-hidden" style={depthStyle}>
          <p data-testid="queue-empty" className="text-sm text-muted-foreground text-center">
            {t('queue.emptyFriendly')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="panel-queue" className="h-full min-h-0 min-w-0 w-full">
      <div className="rounded-xl p-3 h-full flex flex-col gap-2 min-w-0 box-border overflow-hidden" style={depthStyle}>
        <ScrollArea data-testid="queue-scroll-area" className="h-full">
          {jobList.map((job) => {
          const isSelected = selectedJobId === job.id
          const isRetryingThis = isRetrying === job.id
          const isActive = job.status === 'uploading' || job.status === 'processing'
          const kind = fileKind(job.fileName)
          return (
            <div
              key={job.id}
              data-testid="queue-item"
              tabIndex={0}
              role="button"
              aria-selected={isSelected}
              onClick={() => setSelectedJobId(job.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelectedJobId(job.id)
                }
              }}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/50 outline-none ${isSelected ? 'bg-accent/10' : ''}`}
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
              </div>
              <div
                data-testid="queue-item-status-slot"
                className="w-[14px] shrink-0 flex items-center justify-center"
              >
                {job.status === 'completed' && (
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          data-testid="queue-item-status-dot"
                          className="w-2.5 h-2.5 rounded-full shrink-0 block"
                          style={{ background: 'radial-gradient(circle at 30% 30%, #86EFAC, #16A34A 60%, #14532D)' }}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="translate-y-[-2px]">
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
                          className="w-2.5 h-2.5 rounded-full shrink-0 block"
                          style={{ background: 'radial-gradient(circle at 30% 30%, #FCA5A5, #DC2626 60%, #7F1D1D)' }}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="translate-y-[-2px]">
                        <p>{t('queue.status.failed')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {(job.status === 'pending' || job.status === 'uploading' || job.status === 'processing') && (
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {isActive ? (
                          <Spinner
                            data-testid="queue-item-status-dot"
                            className="size-3.5"
                            style={{ color: '#FACC15' }}
                          />
                        ) : (
                          <span
                            data-testid="queue-item-status-dot"
                            className="w-2.5 h-2.5 rounded-full shrink-0 block"
                            style={{ background: theme === 'dark' ? '#A8A29E' : '#78716C' }}
                          />
                        )}
                      </TooltipTrigger>
                      <TooltipContent side="top" className="translate-y-[-2px]">
                        <p>{t(`queue.status.${job.status}`)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              {job.status === 'failed' && (
                <button
                  data-testid="queue-item-retry"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsRetrying(job.id)
                    retryJob(job.id).finally(() => setIsRetrying(null))
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
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </div>
    </div>
  )
}
