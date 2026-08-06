import { useEffect, useRef } from 'react'
import { useFileStore } from '../stores/fileStore'

const WS_URL = 'ws://127.0.0.1:8000/ws/progress'

export function useProgressSocket() {
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      // connected
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as {
          task_id?: string
          progress?: number
          status?: string
        }

        if (payload.task_id && payload.progress !== undefined) {
          useFileStore.getState().updateFileProgress(payload.task_id, payload.progress)
        }

        if (payload.task_id && payload.status) {
          useFileStore.getState().updateFileStatus(payload.task_id, payload.status as any)
        }
      } catch {
        // ignore invalid JSON
      }
    }

    ws.onerror = () => {
      // connection error - handled by UI state
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [])

  return { connected: wsRef.current?.readyState === 1 }
}
