import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePreferenceStore } from './stores/preferencesStore'
import { useScan2TextStore } from './stores/scan2text.store'
import { buildApiUrl } from './lib/apiBase'
import CommandCenterLayout from './components/layout/CommandCenterLayout'
import WelcomeModal from './components/layout/WelcomeModal'
import ModelDownloaderModal from './components/layout/ModelDownloaderModal'
import { useBackendBootFailedListener } from './hooks/useBackendBootFailedListener'
import { toast } from 'sonner'

const FEEDBACK_FORM_URL = 'https://placeholder.local/feedback'

function App() {
  const { t } = useTranslation()
  const [hideWelcomeNotice, setHideWelcomeNotice] = useState<boolean | null>(null)
  const [modelReady, setModelReady] = useState<boolean>(false)
  const showDownloader = useScan2TextStore((s) => s.showDownloader)
  const setShowDownloader = useScan2TextStore((s) => s.setShowDownloader)

  useBackendBootFailedListener()

  useEffect(() => {
    usePreferenceStore.getState().hydratePreferences(window.localStorage, navigator.language)
  }, [])

  useEffect(() => {
    fetch(buildApiUrl('/api/settings'))
      .then((res) => res.json())
      .then((data) => {
        setHideWelcomeNotice(!!data.hide_welcome_notice)
      })
      .catch(() => {
        setHideWelcomeNotice(false)
      })
  }, [])

  useEffect(() => {
    const checkModelStatus = async () => {
      try {
        const res = await fetch(`${buildApiUrl('/api/health')}?t=${Date.now()}`)
        const data: { model: { files_present: boolean }; ram: { percent: number } } = await res.json()
        if (data.model.files_present) {
          setModelReady(true)
        } else {
          // Model files missing — start download and show modal.
          await fetch(buildApiUrl('/api/download/start'), { method: 'POST' })
          setShowDownloader(true)
        }
      } catch (err) {
        console.error('Health check error:', err);
        // Backend unavailable (demo/offline) — skip downloader, proceed to welcome.
        setModelReady(true)
      }
    }
    void checkModelStatus()
  }, [])

  useEffect(() => {
    if (!navigator.onLine) return
      fetch(buildApiUrl('/api/feedback/pending-count'))
      .then((res) => res.json())
      .then((data) => {
        if (data.count > 0) {
          toast(t('feedback.pendingToast'), {
            action: {
              label: t('feedback.pendingAction'),
              onClick: () => {
                void window.open(FEEDBACK_FORM_URL, '_blank')
              },
            },
            id: 'feedback-pending-toast',
          })
        }
      })
      .catch(() => {})
  }, [])

  const handleDownloaderClose = () => {
    setShowDownloader(false)
    setModelReady(true)
  }

  return (
    <>
      <CommandCenterLayout />
      <ModelDownloaderModal open={showDownloader} onClose={handleDownloaderClose} />
      {modelReady && !hideWelcomeNotice && <WelcomeModal />}
    </>
  )
}

export default App
