import { useEffect } from 'react'
import { usePreferenceStore } from './stores/preferencesStore'
import CommandCenterLayout from './components/layout/CommandCenterLayout'

function App() {
  useEffect(() => {
    usePreferenceStore.getState().hydratePreferences(window.localStorage, navigator.language)
  }, [])

  return <CommandCenterLayout />
}

export default App
