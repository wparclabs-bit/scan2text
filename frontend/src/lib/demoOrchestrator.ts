import { useScan2TextStore } from '../stores/scan2text.store'
import { IS_DEMO_MODE } from './demoMode'

const TERMINAL_STATUSES = ['completed', 'failed'] as const

function isTerminal(status: string): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(status)
}

export function startDemoOrchestrator(): (() => void) | void {
  if (!IS_DEMO_MODE) return

  const tick = () => {
    const state = useScan2TextStore.getState()
    if (state.activeJobId) {
      const active = state.jobs[state.activeJobId]
      if (active && !isTerminal(active.status)) return
    }

    const nextJobId = state.jobOrder.find((jid) => {
      const j = state.jobs[jid]
      return j && !isTerminal(j.status)
    })

    if (nextJobId) {
      const nextJob = state.jobs[nextJobId]
      if (nextJob && nextJob.file) {
        useScan2TextStore.getState().startUpload({
          file: nextJob.file,
          jobId: nextJobId,
        })
        return
      }
    }

    useScan2TextStore.setState({ activeJobId: null })
  }

  const interval = globalThis.setInterval(tick, 1500)
  tick()

  return () => globalThis.clearInterval(interval)
}
