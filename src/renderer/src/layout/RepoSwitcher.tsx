import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useApp } from '../store'
import { t } from '../i18n'
import { basename, shortPath } from '../utils/format'

/**
 * Repository switcher popover: recent repositories first, then a folder
 * picker entry (and "Close repository" for the logo variant).
 * Shared by the tab-strip "+" button and the top-left "Git GUI" logo.
 */
export function RepoSwitcher(props: {
  variant: 'add' | 'logo'
  children: (onClick: () => void, ref: React.RefObject<HTMLButtonElement | null>) => React.ReactNode
}): React.JSX.Element {
  const settings = useApp((s) => s.settings)
  const openRepos = useApp((s) => s.openRepos)
  const repoPath = useApp((s) => s.repoPath)
  const openRepo = useApp((s) => s.openRepo)
  const switchRepo = useApp((s) => s.switchRepo)
  const closeRepo = useApp((s) => s.closeRepo)

  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useLayoutEffect(() => {
    if (!open) return
    const el = btnRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({ x: Math.max(4, r.left), y: r.bottom + 4 })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent): void => {
      const target = e.target as Node
      if (menuRef.current?.contains(target) || btnRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const go = (path: string): void => {
    setOpen(false)
    void (openRepos.includes(path) ? switchRepo(path) : openRepo(path))
  }

  const pickFolder = async (): Promise<void> => {
    setOpen(false)
    const dir = await window.api.pickDirectory()
    if (dir) await openRepo(dir)
  }

  // Recent list first; drop ones that are already open tabs (still listed, but
  // only once — openRepos copy keeps its tab highlight instead).
  const recents = (settings.recent ?? []).filter((p) => p !== repoPath).slice(0, 10)

  return (
    <>
      {props.children(
        () => setOpen((v) => !v),
        btnRef
      )}
      {open && (
        <div
          ref={menuRef}
          className="fixed z-[60] min-w-64 rounded-md border border-zinc-700 bg-zinc-900 py-1 shadow-2xl"
          style={{ left: pos.x, top: pos.y }}
          data-testid={`repo-switcher-${props.variant}`}
        >
          {recents.length > 0 && (
            <div className="px-3 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {t('repoTabs.recent')}
            </div>
          )}
          {recents.map((p) => (
            <button
              key={p}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-800"
              title={p}
              data-testid={`repo-switcher-recent-${p}`}
              onClick={() => go(p)}
            >
              <span className="min-w-0 flex-1 truncate">{basename(p)}</span>
              {openRepos.includes(p) && <span className="shrink-0 text-[10px] text-emerald-500">●</span>}
              <span className="shrink-0 text-[10px] text-zinc-500">{shortPath(p)}</span>
            </button>
          ))}
          <div className="my-1 border-t border-zinc-800" />
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-800"
            onClick={() => void pickFolder()}
            data-testid="repo-switcher-browse"
          >
            {t('repoTabs.open')}
          </button>
          {props.variant === 'logo' && repoPath && (
            <button
              className="mt-0.5 flex w-full items-center gap-2 border-t border-zinc-800 px-3 py-1.5 text-left text-xs text-rose-400 hover:bg-rose-500/10"
              onClick={() => {
                setOpen(false)
                void closeRepo()
              }}
              data-testid="repo-switcher-close-current"
            >
              {t('toolbar.close')}
            </button>
          )}
        </div>
      )}
    </>
  )
}
