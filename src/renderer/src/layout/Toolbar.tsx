import { memo } from 'react'
import { useApp } from '../store'
import { t, tf } from '../i18n'
import { btnGhost } from '../components/Modal'

export const Toolbar = memo(function Toolbar(): React.JSX.Element {
  const status = useApp((s) => s.status)
  const sync = useApp((s) => s.sync)
  const fetchNow = useApp((s) => s.fetch)
  const pull = useApp((s) => s.pull)
  const push = useApp((s) => s.push)
  const cancelSync = useApp((s) => s.cancelSync)
  const refreshStatus = useApp((s) => s.refreshStatus)
  const loadGraph = useApp((s) => s.loadGraph)
  const settings = useApp((s) => s.settings)
  const updateSettings = useApp((s) => s.updateSettings)
  const closeRepo = useApp((s) => s.closeRepo)

  const disabled = sync !== null

  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs">
      <button
        className="rounded px-2 py-1 font-semibold text-zinc-300 hover:bg-zinc-800"
        onClick={() => void closeRepo()}
        title={t('toolbar.close')}
      >
        Git GUI
      </button>

      <span
        className="rounded bg-zinc-800 px-2 py-1 font-medium text-emerald-400"
        title={status?.detached ? t('status.detached') : status?.upstream}
      >
        {status?.detached ? `${t('status.detached')} @ ${status.oid?.slice(0, 7) ?? '?'}` : (status?.head ?? '…')}
      </span>

      {status && (status.ahead > 0 || status.behind > 0) && (
        <span className="rounded bg-zinc-800 px-1.5 py-1 text-zinc-400">
          ↑{status.ahead} ↓{status.behind}
        </span>
      )}

      <span className="flex-1" />

      <button className={btnGhost()} disabled={disabled} onClick={() => void fetchNow()}>
        {t('toolbar.fetch')}
      </button>
      <button className={btnGhost()} disabled={disabled} onClick={() => void pull()}>
        {t('toolbar.pull')}
      </button>
      <button
        className="rounded border border-emerald-700 px-3 py-1.5 text-sm text-emerald-400 hover:bg-emerald-900/40 disabled:opacity-50"
        disabled={disabled}
        onClick={() => void push()}
      >
        {t('toolbar.push')}
      </button>

      <button
        className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800"
        onClick={() => {
          void refreshStatus()
          void loadGraph(true)
        }}
        title={t('toolbar.refresh')}
      >
        ⟳
      </button>

      <span className="mx-1 h-4 w-px bg-zinc-700" />

      <button
        className={`rounded px-2 py-1 ${settings.language === 'zh' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-800'}`}
        onClick={() => void updateSettings({ language: 'zh' })}
      >
        中
      </button>
      <button
        className={`rounded px-2 py-1 ${settings.language === 'en' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-800'}`}
        onClick={() => void updateSettings({ language: 'en' })}
      >
        EN
      </button>

      {sync && (
        <span className="flex items-center gap-2 rounded bg-zinc-800 px-2 py-1 text-zinc-300">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          {t('toolbar.syncing')}
          {sync.progress && (
            <span className="text-zinc-500">
              {sync.progress.stage}
              {sync.progress.percent != null ? ` ${sync.progress.percent}%` : ''}
            </span>
          )}
          <button
            className="rounded px-1 text-rose-400 hover:bg-zinc-700"
            onClick={() => void cancelSync()}
            title={t('toolbar.cancelOp')}
          >
            ✕
          </button>
        </span>
      )}

      {!sync && status && (
        <span className="text-zinc-600">
          {tf('status.staged', { n: status.files.filter((f) => f.indexStatus !== ' ' && f.indexStatus !== '?').length })}
        </span>
      )}
    </header>
  )
})
