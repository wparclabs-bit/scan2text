import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useScan2TextStore } from '@/stores/scan2text.store'
import { Share } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import FeedbackButton from './FeedbackButton'
import { buildApiUrl } from '@/lib/apiBase'

const VERSION = 'v1.0.0'
const SHARE_URL = 'https://placeholder.local'

function getWorkerStatus() {
  const jobs = useScan2TextStore.getState().jobs
  const hasActive = Object.values(jobs).some(
    (j) => j.status === 'uploading' || j.status === 'processing',
  )
  return hasActive ? 'Busy' : 'Idle'
}

export default function BottomStatusBar() {
  const { t } = useTranslation()
  const workerStatus = getWorkerStatus()
  const [ramPercent, setRamPercent] = useState<number | null>(null)
  const [cpuPercent, setCpuPercent] = useState<number | null>(null)

  useEffect(() => {
    const pollHealth = async () => {
      try {
        const res = await fetch(`${buildApiUrl('/api/health')}?t=${Date.now()}`)
        const data = await res.json()
        if (data.ram?.percent != null) {
          setRamPercent(Math.round(data.ram.percent))
        }
        if (data.cpu?.percent != null) {
          setCpuPercent(Math.round(data.cpu.percent))
        }
      } catch {
        // Backend unavailable — keep "—"
      }
    }
    void pollHealth()
    const interval = globalThis.setInterval(pollHealth, 10_000)
    return () => globalThis.clearInterval(interval)
  }, [])

  const handleShare = () => {
    void navigator.clipboard?.writeText(SHARE_URL)
    toast.info(t('toast.shareComingSoon'))
  }

  const ramDisplay = ramPercent != null ? t('bottomBar.ramUsage', { percent: ramPercent }) : '—'
  const cpuDisplay = cpuPercent != null ? t('bottomBar.cpuUsage', { percent: cpuPercent }) : '—'

  return (
    <footer data-testid="bottom-bar" className="px-4 py-1 text-sm text-muted-foreground font-display h-[36px] flex items-center shrink-0">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center w-full">
        <div />
        <div className="flex items-center justify-center gap-4">
          <span>{t('bottomBar.workerLabel', { status: workerStatus })}</span>
          <span className="h-px w-px bg-border" aria-hidden="true" />
          <span>{ramDisplay}</span>
          <span className="h-px w-px bg-border" aria-hidden="true" />
          <span>{cpuDisplay}</span>
          <span className="h-px w-px bg-border" aria-hidden="true" />
          <span>{VERSION}</span>
        </div>
        <div className="flex items-center justify-end gap-2">
          <FeedbackButton onOfflineOpen={() => {}} />
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  data-testid="share-button"
                  onClick={handleShare}
                  aria-label={t('actions.shareTooltip')}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Share className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{t('actions.shareTooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </footer>
  )
}
