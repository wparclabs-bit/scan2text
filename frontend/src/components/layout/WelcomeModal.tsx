import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { buildApiUrl } from '@/lib/apiBase'

interface WelcomeModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function WelcomeModal({ open: controlledOpen, onOpenChange }: WelcomeModalProps = {}) {
  const { t } = useTranslation()
  const [hideNotice, setHideNotice] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (controlledOpen !== undefined) return
    fetch(buildApiUrl('/api/settings'))
      .then((res) => res.json())
      .then((data) => {
        if (!data.hide_welcome_notice) {
          setModalOpen(true)
        }
      })
      .catch(() => {
        setModalOpen(true)
      })
  }, [controlledOpen])

  const handleCheckboxChange = (checked: boolean) => {
    setHideNotice(checked)
    if (typeof fetch !== 'undefined') {
      const result = fetch(buildApiUrl('/api/settings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hide_welcome_notice: checked }),
      })
      if (result && typeof result.catch === 'function') {
        result.catch(() => {})
      }
    }
  }

  const handleClose = () => {
    setModalOpen(false)
    onOpenChange?.(false)
  }

  const dialogOpen = controlledOpen !== undefined ? controlledOpen : modalOpen
  const dialogOnOpenChange = controlledOpen !== undefined ? onOpenChange : setModalOpen

  return (
    <Dialog open={dialogOpen} onOpenChange={dialogOnOpenChange}>
      <DialogContent data-testid="welcome-modal" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('welcome.title')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-4">{t('welcome.body')}</p>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="welcome-dont-show"
            checked={hideNotice}
            onChange={(e) => handleCheckboxChange(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          <label htmlFor="welcome-dont-show" className="text-sm text-muted-foreground cursor-pointer">
            {t('welcome.dontShowAgain')}
          </label>
        </div>
        <DialogFooter>
          <Button onClick={handleClose}>{t('welcome.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
