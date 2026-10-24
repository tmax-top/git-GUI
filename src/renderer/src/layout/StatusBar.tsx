import { memo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons'
import { useApp } from '../store'
import { t, tf } from '../i18n'
import { isStaged, isUntracked } from '@shared/status'

export const StatusBar = memo(function StatusBar(): React.JSX.Element {
  const repoPath = useApp((s) => s.repoPath)
  const status = useApp((s) => s.status)
  const error = useApp((s) => s.error)
  const dismissError = useApp((s) => s.dismissError)
  const openErrorDetail = useApp((s) => s.openErrorDetail)
  const sync = useApp((s) => s.sync)

  const staged = status?.files.filter(isStaged).length ?? 0
  const untracked = status?.files.filter(isUntracked).length ?? 0
  const unstaged = (status?.files.length ?? 0) - staged - untracked

  return (
    <footer className="flex shrink-0 items-center gap-3 border-t border-zinc-800 bg-zinc-900 px-3 py-1 text-[11px] text-zinc-500">
      <span className="min-w-0 flex-1 truncate" title={repoPath ?? ''}>
        {repoPath ?? ''}
      </span>

      {error && (
        <span className="flex min-w-0 max-w-[55%] items-center gap-1.5 rounded bg-rose-950/40 border border-rose-900/60 px-2 py-0.5 text-rose-300">
          <FontAwesomeIcon icon={faCircleExclamation} className="h-3 w-3 shrink-0 text-rose-400" />
          <button
            className="truncate text-left text-rose-300 hover:text-rose-100 hover:underline cursor-pointer"
            onClick={openErrorDetail}
            title={t('error.viewDetail')}
          >
            {error}
          </button>
          <button
            className="shrink-0 rounded px-1 hover:bg-rose-900/50 hover:text-rose-100 text-rose-400"
            onClick={dismissError}
            title={t('common.close')}
          >
            ✕
          </button>
        </span>
      )}

      {sync && (
        <span className="text-emerald-400">
          {sync.kind}
          {sync.progress?.percent != null ? ` ${sync.progress.percent}%` : '…'}
        </span>
      )}

      <span className="text-emerald-500">{tf('status.staged', { n: staged })}</span>
      <span className="text-amber-500">{tf('status.unstaged', { n: unstaged })}</span>
      <span className="text-sky-500">{tf('status.untracked', { n: untracked })}</span>
      {status && (status.ahead > 0 || status.behind > 0) && (
        <span className="text-zinc-400">
          ↑{status.ahead} ↓{status.behind}
        </span>
      )}
      <span className="text-zinc-500">{t('app.title')}</span>
    </footer>
  )
})
