import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="settings-dialog">
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
        </DialogHeader>

        {/* General Section */}
        <div className="space-y-4 py-4 border-b">
          <h3 className="text-sm font-medium text-muted-foreground">{t('settings.general')}</h3>
          <div className="grid gap-2">
            <Label htmlFor="language-select">{t('actions.toggleLanguage')}</Label>
            <select
              id="language-select"
              defaultValue="en"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            >
              <option value="en">English</option>
              <option value="id">Bahasa Indonesia</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="theme-select">{t('actions.toggleTheme')}</Label>
            <select
              id="theme-select"
              defaultValue="dark"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
        </div>

        {/* Processing Section - Locked */}
        <div className="space-y-4 py-4 border-b">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            {t('settings.processing')}
          </h3>
          <div className="grid gap-2">
            <Label htmlFor="output-dir">{t('settings.outputDir')}</Label>
            <div className="flex gap-2">
              <Input
                id="output-dir"
                type="text"
                value="./output"
                disabled
                className="flex-1"
              />
              <Button variant="outline" size="sm" disabled>
                Browse
              </Button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="max-pdf-pages">{t('settings.maxPdfPages')}</Label>
            <Input
              id="max-pdf-pages"
              type="number"
              value={20}
              disabled
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cpu-threads">{t('settings.cpuThreads')}</Label>
            <Input
              id="cpu-threads"
              type="number"
              value={0}
              disabled
            />
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
