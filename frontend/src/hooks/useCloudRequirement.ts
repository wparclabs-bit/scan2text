import { useEffect, useMemo, useState } from 'react'

import { getCloudProfile } from '@/lib/api'
import type { CloudProfileResponse } from '@/lib/api'
import { mirrorRoute } from '@/lib/cloudRouting'
import { useScan2TextStore } from '@/stores/scan2text.store'
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

  return useMemo(() => {
    const latestId = jobOrder.length > 0 ? jobOrder[jobOrder.length - 1] : null
    const job = latestId ? jobs[latestId] : undefined
    const sizeBytes: number =
      (job as { metaSize?: number } | undefined)?.metaSize ??
      (job as { fileSize?: number } | undefined)?.fileSize ??
      0

    if (!job || mirrorRoute(sizeBytes) !== 'cloud') {
      return { profile, cloudBatchId: null, batch: null }
    }

    const decided = Object.keys(jobs)
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
      },
    }
  }, [jobOrder, jobs, profile])
}
