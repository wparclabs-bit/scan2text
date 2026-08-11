import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePreferenceStore } from './stores/preferencesStore'
import { startDemoOrchestrator } from './lib/demoOrchestrator'
import CommandCenterLayout from './components/layout/CommandCenterLayout'
import WelcomeModal from './components/layout/WelcomeModal'
import { toast } from 'sonner'

const FEEDBACK_FORM_URL = 'https://placeholder.local/feedback'

function App() {
  const { t } = useTranslation()
  const [hideWelcomeNotice, setHideWelcomeNotice] = useState<boolean | null>(null)

  useEffect(() => {
    usePreferenceStore.getState().hydratePreferences(window.localStorage, navigator.language)
  }, [])

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        setHideWelcomeNotice(!!data.hide_welcome_notice)
      })
      .catch(() => {
        setHideWelcomeNotice(false)
      })
  }, [])

  useEffect(() => {
    const cleanup = startDemoOrchestrator()
    return cleanup
  }, [])

  useEffect(() => {
    if (!navigator.onLine) return
    fetch('/api/feedback/pending-count')
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

  return (
    <>
      <CommandCenterLayout />
      {!hideWelcomeNotice && <WelcomeModal />}
    </>
  )
}

export default App
