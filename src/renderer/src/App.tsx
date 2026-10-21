import { useEffect } from 'react'
import { useApp } from './store'
import { StartPage } from './layout/StartPage'
import { AppShell } from './layout/AppShell'
import { WorkspaceModal } from './workspaces/WorkspaceModal'
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

  // Global search shortcut: Cmd/Ctrl+F opens the search dialog in-repo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        const st = useApp.getState()
        if (st.view === 'repo' && st.repoPath) {
          e.preventDefault()
          st.openSearch()
        }
      }
      // Toggle the embedded terminal: Ctrl+` (Cmd is reserved for macOS UI).
      if (e.ctrlKey && !e.metaKey && e.key === '`') {
        e.preventDefault()
        useApp.getState().toggleTerminal()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Undo/redo: Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z (skipped while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.key.toLowerCase() !== 'z') return
      const st = useApp.getState()
      if (st.view !== 'repo' || !st.repoPath) return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return
      e.preventDefault()
      if (e.shiftKey) void st.redo()
      else void st.undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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

  return (
    <div className="theme-white">
      {view === 'repo' ? <AppShell /> : <StartPage />}
      <WorkspaceModal />
    </div>
  )
}
