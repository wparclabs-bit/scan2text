import { useEffect } from 'react'
import { usePreferenceStore } from './stores/preferencesStore'
import { startDemoOrchestrator } from './lib/demoOrchestrator'
import CommandCenterLayout from './components/layout/CommandCenterLayout'

function App() {
  useEffect(() => {
    usePreferenceStore.getState().hydratePreferences(window.localStorage, navigator.language)
  }, [])

  useEffect(() => {
    const cleanup = startDemoOrchestrator()
    return cleanup
  }, [])

  return <CommandCenterLayout />
}

export default App
