import { useTranslation } from 'react-i18next'
import { MessageSquare } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const FEEDBACK_FORM_URL = 'https://placeholder.local/feedback'

interface FeedbackButtonProps {
  onOfflineOpen: () => void
}

export default function FeedbackButton({ onOfflineOpen }: FeedbackButtonProps) {
  const { t } = useTranslation()

  const handleClick = () => {
    if (navigator.onLine) {
      void window.open(FEEDBACK_FORM_URL, '_blank')
    } else {
      onOfflineOpen()
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
