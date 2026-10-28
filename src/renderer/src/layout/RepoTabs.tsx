import { useApp } from '../store'
import { t } from '../i18n'
import { basename } from '../utils/format'
import { RepoSwitcher } from './RepoSwitcher'

/**
 * Multi-repository tab strip below the toolbar: click a tab to switch,
 * ✕ closes it (activating a neighbour when it is the active one),
 * ＋ opens the repository switcher (recent list first, then a folder picker).
 */
export function RepoTabs(): React.JSX.Element | null {
  const openRepos = useApp((s) => s.openRepos)
  const repoPath = useApp((s) => s.repoPath)
  const switchRepo = useApp((s) => s.switchRepo)
  const closeRepo = useApp((s) => s.closeRepo)

  if (openRepos.length === 0) return null

  return (
    <div
      className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-zinc-800 bg-zinc-950 px-2 py-1"
      data-testid="repo-tabs"
    >
      {openRepos.map((p) => {
        const active = p === repoPath
        return (
          <div
            key={p}
            data-testid={`repo-tab-${p}`}
            title={p}
            onClick={() => {
              if (!active) void switchRepo(p)
            }}
            className={`group flex max-w-56 shrink-0 cursor-pointer items-center gap-1 rounded px-2 py-1 text-xs transition ${
              active
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            <span className="truncate">{basename(p)}</span>
            <button
              className="rounded px-0.5 text-zinc-500 opacity-0 transition group-hover:opacity-100 hover:bg-zinc-700 hover:text-zinc-100"
              title={t('repoTabs.close')}
              aria-label={t('repoTabs.close')}
              onClick={(e) => {
                e.stopPropagation()
                void closeRepo(p)
              }}
            >
              ✕
            </button>
          </div>
        )
      })}
      <RepoSwitcher variant="add">
        {(onClick, ref) => (
          <button
            ref={ref}
            className="ml-1 shrink-0 rounded px-2 py-1 text-xs text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
            title={t('repoTabs.open')}
            aria-label={t('repoTabs.open')}
            data-testid="repo-tab-add"
            onClick={onClick}
          >
            ＋
          </button>
        )}
      </RepoSwitcher>
    </div>
  )
}
