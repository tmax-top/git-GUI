import { useEffect } from 'react'
import { useApp } from './store'
import { StartPage } from './layout/StartPage'
import { AppShell } from './layout/AppShell'
import { t } from './i18n'

export default function App(): React.JSX.Element {
  const booted = useApp((s) => s.booted)
  const view = useApp((s) => s.view)

  useEffect(() => {
    void useApp.getState().boot()
  }, [])

  // Window-level folder drop opens a repository.
  useEffect(() => {
    const prevent = (e: DragEvent): void => e.preventDefault()
    const onDrop = (e: DragEvent): void => {
      e.preventDefault()
      const file = e.dataTransfer?.files?.[0]
      if (!file) return
      try {
        const path = window.api.getPathForFile(file)
        if (path) void useApp.getState().openRepo(path)
      } catch {
        // webUtils unavailable — ignore
      }
    }
    window.addEventListener('dragover', prevent)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', prevent)
      window.removeEventListener('drop', onDrop)
    }
  }, [])

  if (!booted) {
    return (
      <div className="theme-white">
        <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-500">
          {t('common.loading')}
        </div>
      </div>
    )
  }

  return <div className="theme-white">{view === 'repo' ? <AppShell /> : <StartPage />}</div>
}
