import { useEffect, useState } from 'react'
import { usePreferenceStore } from './stores/preferencesStore'
import { startDemoOrchestrator } from './lib/demoOrchestrator'
import CommandCenterLayout from './components/layout/CommandCenterLayout'
import WelcomeModal from './components/layout/WelcomeModal'

function App() {
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

  return (
    <>
      <CommandCenterLayout />
      {!hideWelcomeNotice && <WelcomeModal />}
    </>
  )
}

export default App
