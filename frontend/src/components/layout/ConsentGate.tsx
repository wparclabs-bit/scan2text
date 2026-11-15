import { useEffect, useRef, useState } from 'react'
import CloudConsentModal from './CloudConsentModal'
import { useCloudRequirement } from '@/hooks/useCloudRequirement'
import { useConsentStore } from '@/stores/consent.store'
import { mirrorRoute } from '@/lib/cloudRouting'

/**
 * Mounts the Cloud consent gate for the current queue.
 *
 * When a job lands that would route to the Cloud engine, the gate asks once per
 * session (D-12) or shows the one aggregated escape toast when the Cloud engine
 * is off or no key is stored (D-13). This component sends nothing.
 */
export default function ConsentGate() {
  const requirement = useCloudRequirement()
  const ensureConsent = useConsentStore((s) => s.ensureConsent)
  const setCloudState = useConsentStore((s) => s.setCloudState)
  const pendingBatch = useConsentStore((s) => s.pendingBatch)
  const openRef = useRef(false)
  const [queuedFirst, setQueuedFirst] = useState(false)

  useEffect(() => {
    if (requirement.profile) {
      setCloudState({
        enabled: requirement.profile.enabled,
        hasKey: requirement.profile.credential !== null,
      })
    }
  }, [requirement.profile, setCloudState])

  useEffect(() => {
    if (requirement.cloudBatchId === null) {
      setQueuedFirst(false)
      return
    }
    const gate = ensureConsent(requirement.cloudBatchId)
    if (gate.ask && !openRef.current) {
      openRef.current = true
      setQueuedFirst(true)
    }
  }, [requirement.cloudBatchId, ensureConsent])

  const pending = pendingBatch ?? requirement.batch
  if (!pending) return null

  return (
    <CloudConsentModal
      batch={pending}
      open={queuedFirst}
      onDecision={() => {
        openRef.current = false
        setQueuedFirst(false)
        useConsentStore.getState().setPendingBatch(null)
      }}
      onAddKey={() => useConsentStore.getState().setPendingBatch(null)}
      onEnableCloud={() => useConsentStore.getState().setPendingBatch(null)}
    />
  )
}

/** Exported for tests: the route the gate expects the backend to take. */
export function expectsCloudRoute(fileSize: number): boolean {
  return mirrorRoute(fileSize) === 'cloud'
}
