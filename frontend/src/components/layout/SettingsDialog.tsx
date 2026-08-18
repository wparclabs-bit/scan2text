import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { getSettings, saveSettings } from '@/lib/api'
import type { SettingsResponse } from '@/lib/api'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { t } = useTranslation()
  const [outputDir, setOutputDir] = useState('')
  const [maxPdfPages, setMaxPdfPages] = useState('50')
  const [cpuThreads, setCpuThreads] = useState('0')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getSettings()
      .then((settings: SettingsResponse) => {
        setOutputDir(settings.output_dir ?? '')
        setMaxPdfPages(String(settings.max_pdf_pages ?? 50))
        setCpuThreads(String(settings.cpu_threads ?? 0))
      })
      .catch(() => {
        toast.error(t('settings.loadFailed'))
      })
      .finally(() => {
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleSave = async () => {
    const pages = parseInt(maxPdfPages, 10)
    const threads = parseInt(cpuThreads, 10)

    if (isNaN(pages) || pages < 1) {
      toast.error(t('settings.validationPages'))
      return
    }
    if (isNaN(threads) || threads < 0) {
      toast.error(t('settings.validationThreads'))
      return
    }

    try {
      await saveSettings({
        output_dir: outputDir,
        max_pdf_pages: pages,
        cpu_threads: threads,
      })
      toast.success(t('settings.saved'))
    } catch {
      toast.error(t('settings.saveFailed'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="settings-dialog">
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
        </DialogHeader>

        {/* Processing Section */}
        <div className="space-y-4 py-4 border-b">
          <h3 className="text-sm font-medium text-muted-foreground">{t('settings.processing')}</h3>
          <div className="grid gap-2">
            <Label htmlFor="output-dir">{t('settings.outputDir')}</Label>
            <Input
              id="output-dir"
              data-testid="settings-output-dir"
              type="text"
              value={outputDir}
              onChange={(e) => setOutputDir(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="max-pdf-pages">{t('settings.maxPdfPages')}</Label>
            <Input
              id="max-pdf-pages"
              data-testid="settings-max-pdf-pages"
              type="number"
              value={maxPdfPages}
              onChange={(e) => setMaxPdfPages(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cpu-threads">{t('settings.cpuThreads')}</Label>
            <Input
              id="cpu-threads"
              data-testid="settings-cpu-threads"
              type="number"
              value={cpuThreads}
              onChange={(e) => setCpuThreads(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">{t('settings.autoHint')}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" data-testid="settings-close-btn" onClick={() => onOpenChange(false)}>
            {t('settings.close')}
          </Button>
          <Button data-testid="settings-save-btn" onClick={handleSave} disabled={loading}>
            {t('settings.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
