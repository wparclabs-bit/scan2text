import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogOverlay } from '@/components/ui/dialog'
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

  const bullets = ['bullet1', 'bullet2', 'bullet3', 'bullet4'] as const

  return (
    <Dialog open={dialogOpen} onOpenChange={dialogOnOpenChange}>
      <DialogOverlay className="bg-black/60" />
      <DialogContent data-testid="welcome-modal" className="sm:max-w-md bg-[#F9F8F6] text-[#1F150C] dark:bg-[#080502] dark:text-[#F2EBDD]">
        <DialogHeader>
          <DialogTitle>{t('welcome.title')}</DialogTitle>
        </DialogHeader>
        <ul className="text-sm text-muted-foreground py-4 space-y-1.5 text-left">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2">
              <span className="shrink-0 mt-0.5">·</span>
              <span>{t(`welcome.${bullet}`)}</span>
            </li>
          ))}
        </ul>
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
