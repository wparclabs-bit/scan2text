import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogOverlay } from '@/components/ui/dialog'
import { useConsentStore } from '@/stores/consent.store'
import type { ConsentBatchSummary } from '@/stores/consent.store'

export interface ConsentDecisionResult {
  granted: boolean
  cpuOverride: boolean
}

interface CloudConsentModalProps {
  batch: ConsentBatchSummary
  open: boolean
  onDecision: (decision: ConsentDecisionResult) => void
  onAddKey?: () => void
  onEnableCloud?: () => void
}

const MEGABYTE = 1024 * 1024

function formatTotalSize(bytes: number): string {
  return `${(bytes / MEGABYTE).toFixed(1)} MB`
}

/** The one aggregated escape hatch for a batch: two remedies, one message. */
function EscapeActions({
  secondaryLabel,
  onSecondary,
  cpuLabel,
  onCpu,
}: {
  secondaryLabel: string
  onSecondary: () => void
  cpuLabel: string
  onCpu: () => void
}) {
  return (
    <span data-testid="cloud-consent-escape-actions" className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        data-testid="cloud-consent-escape-secondary"
        onClick={onSecondary}
      >
        {secondaryLabel}
      </Button>
      <Button type="button" variant="outline" data-testid="cloud-consent-escape-cpu" onClick={onCpu}>
        {cpuLabel}
      </Button>
    </span>
  )
}

export default function CloudConsentModal({
  batch,
  open,
  onDecision,
  onAddKey,
  onEnableCloud,
}: CloudConsentModalProps) {
  const { t } = useTranslation()
  const [useCpu, setUseCpu] = useState(false)
  const gate = useConsentStore((s) =>
    s.cloudEnabled ? (s.cloudHasKey ? 'cloud-enabled' : 'needs-key') : 'cloud-disabled',
  )
  const setBatchCpuOverride = useConsentStore((s) => s.setBatchCpuOverride)
  const decideConsent = useConsentStore((s) => s.decideConsent)
  const markEscapeNotified = useConsentStore((s) => s.markEscapeNotified)

  useEffect(() => {
    if (!open || gate === 'cloud-enabled') return
    if (!markEscapeNotified(batch.id)) return

    const secondaryLabel =
      gate === 'needs-key' ? t('consent.toast.addKey') : t('consent.toast.enableCloud')
    const secondaryHandler =
      gate === 'needs-key' ? onAddKey ?? onEnableCloud : onEnableCloud ?? onAddKey

    const content = (
      <EscapeActions
        secondaryLabel={secondaryLabel}
        onSecondary={() => secondaryHandler?.()}
        cpuLabel={t('consent.toast.processOnCpu')}
        onCpu={() => {
          setBatchCpuOverride(batch.id, true)
          decideConsent(batch.id, { granted: false, cpuOverride: true })
          onDecision({ granted: false, cpuOverride: true })
        }}
      />
    )

    toast.info(gate === 'needs-key' ? t('consent.toast.needsKey') : t('consent.toast.cloudDisabled'), {
      id: `cloud-consent-${batch.id}`,
      description: content,
    })
  }, [
    open,
    gate,
    batch.id,
    t,
    setBatchCpuOverride,
    decideConsent,
    markEscapeNotified,
    onDecision,
    onAddKey,
    onEnableCloud,
  ])

  const complete = (granted: boolean, cpuOverride: boolean) => {
    decideConsent(batch.id, { granted, cpuOverride })
    if (cpuOverride) {
      setBatchCpuOverride(batch.id, true)
    }
    onDecision({ granted, cpuOverride })
  }

  return (
    <Dialog open={open} onOpenChange={() => complete(false, false)}>
      <DialogOverlay className="bg-black/60" />
      <DialogContent
        data-testid="cloud-consent-modal"
        className="sm:max-w-md bg-[#F9F8F6] text-[#1F150C] dark:bg-[#080502] dark:text-[#F2EBDD]"
      >
        <DialogHeader>
          <DialogTitle>{t('consent.title')}</DialogTitle>
        </DialogHeader>
        <dl className="text-sm py-4 space-y-1.5 text-left">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t('consent.provider')}</dt>
            <dd data-testid="cloud-consent-provider">{batch.providerName}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t('consent.model')}</dt>
            <dd data-testid="cloud-consent-model" className="truncate">{batch.modelId}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t('consent.fileCount')}</dt>
            <dd data-testid="cloud-consent-file-count">{batch.fileCount}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t('consent.totalSize')}</dt>
            <dd data-testid="cloud-consent-total-size">{formatTotalSize(batch.totalSizeBytes)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t('consent.region')}</dt>
            <dd data-testid="cloud-consent-region">{batch.region}</dd>
          </div>
          {batch.estimatedCostUsd !== undefined && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t('consent.estimatedCost')}</dt>
              <dd data-testid="cloud-consent-estimated-cost">
                ${batch.estimatedCostUsd.toFixed(4)}
              </dd>
            </div>
          )}
        </dl>
        <p data-testid="cloud-consent-traffic-notice" className="text-xs text-muted-foreground">
          {t('consent.trafficNotice')}
        </p>
        <p data-testid="cloud-consent-cost-disclaimer" className="text-xs text-muted-foreground">
          {t('cloudCost.estimateNotice')}
        </p>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            data-testid="cloud-consent-cpu-checkbox"
            checked={useCpu}
            onChange={(event) => setUseCpu(event.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          {t('consent.useCpu')}
        </label>
        <DialogFooter>
          <Button variant="outline" data-testid="cloud-consent-cancel" onClick={() => complete(false, false)}>
            {t('consent.cancel')}
          </Button>
          <Button data-testid="cloud-consent-send" onClick={() => complete(true, useCpu)}>
            {t('consent.send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
