import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { buildApiUrl } from '@/lib/apiBase'

interface FeedbackDialogProps {
  open: boolean
  onClose: () => void
}

export default function FeedbackDialog({ open, onClose }: FeedbackDialogProps) {
  const { t } = useTranslation()
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (message.trim().length < 10) {
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(buildApiUrl('/api/feedback'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          contact: contact.trim() || null,
        }),
      })
      if (res.ok) {
        toast.success(t('feedback.success'))
        onClose()
      } else {
        toast.error(t('errors.uploadFailed'))
      }
    } catch {
      toast.error(t('errors.uploadFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="feedback-dialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('feedback.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="feedback-message" className="text-sm font-medium">
              {t('feedback.messageLabel')}
            </label>
            <textarea
              data-testid="feedback-textarea"
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('feedback.messagePlaceholder')}
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="feedback-contact" className="text-sm font-medium">
              {t('feedback.contactLabel')}
            </label>
            <input
              data-testid="feedback-contact"
              id="feedback-contact"
              type="email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={t('feedback.contactPlaceholder')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting || message.trim().length < 10} data-testid="feedback-submit">
            {t('feedback.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
