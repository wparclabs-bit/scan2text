import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { listen } from '@tauri-apps/api/event'
import { toast } from 'sonner'

export function useBackendBootFailedListener() {
  const { t } = useTranslation()

  useEffect(() => {
    let unsub: (() => void) | null = null
    void listen<string>('backend-boot-failed', () => {
      toast.error(t('backend.bootFailed'))
    }).then((fn) => {
      unsub = fn
    })
    return () => {
      unsub?.()
    }
  }, [t])
}
