import { useEffect, useMemo, useState } from 'react'

import { getCloudProfile } from '@/lib/api'
import type { CloudProfileResponse } from '@/lib/api'
import { mirrorRoute } from '@/lib/cloudRouting'
import { estimateCloudCostUsd } from '@/lib/cloudCost'
import { useScan2TextStore } from '@/stores/scan2text.store'
import { useCloudSpendStore } from '@/stores/cloudSpend.store'
import type { ConsentBatchSummary } from '@/stores/consent.store'

/**
 * Reads the Cloud Profile and the queue, and reports the newest job that would
 * route to the Cloud engine. The backend still owns the route; this hook only
 * decides when to ask for consent.
 */
export function useCloudRequirement(): {
  profile: CloudProfileResponse | null
  cloudBatchId: string | null
  batch: ConsentBatchSummary | null
} {
  const [profile, setProfile] = useState<CloudProfileResponse | null>(null)
  const jobOrder = useScan2TextStore((s) => s.jobOrder)
  const jobs = useScan2TextStore((s) => s.jobs)
  const setJobEstimate = useCloudSpendStore((s) => s.setJobEstimate)
  const perDocumentEstimate = useMemo(
    () => (profile ? estimateCloudCostUsd(profile.cost_estimate) : null),
    [profile],
  )

  useEffect(() => {
    let active = true
    void getCloudProfile()
      .then((loaded) => {
        if (active) setProfile(loaded)
      })
      .catch(() => {
        // No profile available: the Cloud engine is treated as off.
        if (active) setProfile(null)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (perDocumentEstimate === null) return
    for (const id of jobOrder) {
      const item = jobs[id]
      if (!item) continue
      const sizeBytes = item.metaSize ?? item.fileSize ?? 0
      if (mirrorRoute(sizeBytes) === 'cloud') {
        setJobEstimate(id, perDocumentEstimate)
      }
    }
  }, [jobOrder, jobs, perDocumentEstimate, setJobEstimate])

  return useMemo(() => {
    const latestId = jobOrder.length > 0 ? jobOrder[jobOrder.length - 1] : null
    const job = latestId ? jobs[latestId] : undefined
    const sizeBytes: number = job?.metaSize ?? job?.fileSize ?? 0

    if (!job || mirrorRoute(sizeBytes) !== 'cloud') {
      return { profile, cloudBatchId: null, batch: null }
    }

    const decided = Object.keys(jobs)
    const cloudJobIds = decided.filter((id) => {
      const item = jobs[id] as { metaSize?: number; fileSize?: number }
      return mirrorRoute(item.metaSize ?? item.fileSize ?? 0) === 'cloud'
    })
    return {
      profile,
      cloudBatchId: latestId,
      batch: {
        id: latestId as string,
        providerName: profile?.name ?? 'Cloud Profile',
        modelId: profile?.model_id ?? '',
        region: profile?.region ?? '',
        fileCount: decided.length,
        totalSizeBytes: decided.reduce((total, id) => {
          const item = jobs[id] as { metaSize?: number; fileSize?: number }
          return total + (item.metaSize ?? item.fileSize ?? 0)
        }, 0),
        estimatedCostUsd:
          perDocumentEstimate === null
            ? undefined
            : perDocumentEstimate * cloudJobIds.length,
      },
    }
  }, [jobOrder, jobs, perDocumentEstimate, profile])
}
