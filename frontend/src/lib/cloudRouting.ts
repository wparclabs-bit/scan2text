/**
 * Frontend mirror of the backend routing bounds.
 *
 * Convenience only: the drop zone may reject an over-ceiling file early, but the
 * backend `src/scan2text/cloud/route_decision.py` owns both bounds and the route
 * decision. Keep these numbers in step by hand; the API exposes them at
 * `GET /api/cloud/routing`.
 */
export const LOCAL_THRESHOLD_BYTES = 8 * 1024 * 1024 // 8 MB
export const CEILING_BYTES = 50 * 1024 * 1024 // 50 MB

export type MirroredRoute = 'local' | 'cloud'

/** True only when a file is over the ceiling and cannot be routed at all. */
export function exceedsCeiling(sizeBytes: number): boolean {
  return sizeBytes > CEILING_BYTES
}

/** The route the backend is expected to choose, for display and early UX only. */
export function mirrorRoute(sizeBytes: number): MirroredRoute | null {
  if (exceedsCeiling(sizeBytes)) return null
  return sizeBytes <= LOCAL_THRESHOLD_BYTES ? 'local' : 'cloud'
}
