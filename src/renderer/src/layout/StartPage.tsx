import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { t } from '../i18n'
import { btnGhost, btnPrimary } from '../components/Modal'
import { basename, shortPath } from '../utils/format'
import { CloneDialog, InitDialog } from './Dialogs'

export function StartPage(): React.JSX.Element {
  const settings = useApp((s) => s.settings)
  const updateSettings = useApp((s) => s.updateSettings)
  const openRepo = useApp((s) => s.openRepo)
  const openWorkspaceModal = useApp((s) => s.openWorkspaceModal)
  const error = useApp((s) => s.error)
  const workspaces = settings.workspaces ?? []
  const [cloneOpen, setCloneOpen] = useState(false)
  const [initOpen, setInitOpen] = useState(false)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const onDragOver = (e: DragEvent): void => {
      e.preventDefault()
      setDragging(true)
    }
    const onDragLeave = (e: DragEvent): void => {
      if (e.relatedTarget === null) setDragging(false)
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
    }
  }, [])

  const handleOpen = async (): Promise<void> => {
    const dir = await window.api.pickDirectory()
    if (dir) await openRepo(dir)
  }

  const removeFavorite = (path: string): void => {
    void updateSettings({ favorites: settings.favorites.filter((f) => f.path !== path) })
  }

  const toggleFavorite = (path: string): void => {
    const existing = settings.favorites.find((f) => f.path === path)
    if (existing) {
      removeFavorite(path)
    } else {
      void updateSettings({
        favorites: [...settings.favorites, { name: basename(path), path }]
      })
    }
  }

  return (
    <div className="relative flex h-screen flex-col items-center justify-center gap-8 bg-zinc-950 p-8 text-zinc-100">
      <div className="absolute right-4 top-4 flex gap-2">
        <button
          className={`rounded px-2 py-1 text-xs ${settings.language === 'zh' ? 'bg-emerald-700 text-white' : 'bg-zinc-800 text-zinc-400'}`}
          onClick={() => void updateSettings({ language: 'zh' })}
        >
          中文
        </button>
        <button
          className={`rounded px-2 py-1 text-xs ${settings.language === 'en' ? 'bg-emerald-700 text-white' : 'bg-zinc-800 text-zinc-400'}`}
          onClick={() => void updateSettings({ language: 'en' })}
        >
          EN
        </button>
      </div>

      <div className="text-center">
        <div className="text-3xl font-bold tracking-tight">Git GUI</div>
        <div className="mt-1 text-sm text-zinc-500">
          GitKraken-style client · no license wall
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button className={btnPrimary() + ' px-5 py-2.5'} onClick={() => void handleOpen()}>
          {t('start.open')}
        </button>
        <button className={btnGhost() + ' px-5 py-2.5'} onClick={() => setCloneOpen(true)} data-testid="start-clone-btn">
          {t('start.clone')}
        </button>
        <button className={btnGhost() + ' px-5 py-2.5'} onClick={() => setInitOpen(true)}>
          {t('start.init')}
        </button>
        <button
          className={btnGhost() + ' px-5 py-2.5'}
          onClick={openWorkspaceModal}
          data-testid="start-workspace-btn"
        >
          {t('workspace.title')}
        </button>
      </div>

      {error && <div className="max-w-xl text-center text-sm text-rose-400">{error}</div>}

      <div className="w-full max-w-2xl space-y-6">
        {workspaces.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t('workspace.title')}
              </h3>
              <button
                className="text-xs text-sky-400 hover:underline"
                onClick={openWorkspaceModal}
              >
                {t('workspace.manage')}
              </button>
            </div>
            <div className="space-y-2">
              {workspaces.map((w) => (
                <div
                  key={w.id}
                  className="rounded border border-zinc-800 bg-zinc-900/60 p-3"
                  data-testid={`start-workspace-${w.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-zinc-200">{w.name}</span>
                    <span className="text-[11px] text-zinc-500">{w.repoPaths.length} 个仓库</span>
                  </div>
                  {w.repoPaths.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {w.repoPaths.map((p) => (
                        <button
                          key={p}
                          className="flex items-center justify-between rounded bg-zinc-950 px-3 py-2 text-left text-xs hover:bg-zinc-800"
                          onClick={() => void openRepo(p)}
                        >
                          <span className="truncate text-zinc-200 font-medium">{basename(p)}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-zinc-600">{t('workspace.noRepos')}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {settings.favorites.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t('start.favorites')}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {settings.favorites.map((f) => (
                <div
                  key={f.path}
                  className="group flex items-center justify-between rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm hover:border-emerald-700"
                >
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => void openRepo(f.path)}
                    title={f.path}
                  >
                    <div className="truncate font-medium">{f.name}</div>
                    <div className="truncate text-xs text-zinc-500">{shortPath(f.path)}</div>
                  </button>
                  <button
                    className="ml-2 hidden text-zinc-500 hover:text-rose-400 group-hover:block"
                    onClick={() => removeFavorite(f.path)}
                    title={t('common.remove')}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {settings.recent.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t('start.recent')}
            </h3>
            <ul className="space-y-1">
              {settings.recent.slice(0, 8).map((p) => (
                <li key={p} className="group flex items-center gap-2 text-sm">
                  <button
                    className="min-w-0 flex-1 truncate text-left text-zinc-300 hover:text-emerald-400"
                    onClick={() => void openRepo(p)}
                    title={p}
                  >
                    {p}
                  </button>
                  <button
                    className="text-zinc-600 opacity-0 hover:text-amber-400 group-hover:opacity-100"
                    onClick={() => toggleFavorite(p)}
                    title={
                      settings.favorites.some((f) => f.path === p)
                        ? t('start.starRemove')
                        : t('start.starAdd')
                    }
                  >
                    {settings.favorites.some((f) => f.path === p) ? '★' : '☆'}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {settings.favorites.length === 0 && settings.recent.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-700 px-6 py-10 text-center text-sm text-zinc-500">
            {t('start.empty')}
          </div>
        )}
      </div>

      <div className="text-xs text-zinc-600">{t('start.drop')}</div>

      {dragging && (
        <div className="pointer-events-none absolute inset-4 z-40 flex items-center justify-center rounded-xl border-2 border-dashed border-emerald-500 bg-emerald-500/10 text-lg text-emerald-300">
          {t('start.drop')}
        </div>
      )}

      {cloneOpen && <CloneDialog onClose={() => setCloneOpen(false)} />}
      {initOpen && <InitDialog onClose={() => setInitOpen(false)} />}
    </div>
  )
}
