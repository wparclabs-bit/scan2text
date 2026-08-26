import { useTranslation } from 'react-i18next'
import { MessageSquare } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { open } from '@tauri-apps/plugin-shell'
import { toast } from 'sonner'

const FEEDBACK_FORM_URL = 'https://forms.gle/dJ2tLYzuffp31mHE7'

export default function FeedbackButton() {
  const { t } = useTranslation()

  const handleClick = async () => {
    if (!navigator.onLine) {
      toast.info(t('toast.feedbackOffline'))
      return
    }
    try {
      await open(FEEDBACK_FORM_URL)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open feedback form'
      toast.error(t('toast.feedbackError', { message }))
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            data-testid="feedback-button"
            onClick={handleClick}
            aria-label={t('feedback.tooltip')}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{t('feedback.tooltip')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
