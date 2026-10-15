import { memo, useState } from 'react'
import { useApp } from '../store'
import { t, tf } from '../i18n'

/** Sticky banner shown while a merge/rebase/cherry-pick/revert is interrupted. */
export const OpBanner = memo(function OpBanner(): React.JSX.Element | null {
  const opState = useApp((s) => s.opState)
  const opContinue = useApp((s) => s.opContinue)
  const opAbort = useApp((s) => s.opAbort)
  const opSkip = useApp((s) => s.opSkip)
  const [busy, setBusy] = useState(false)

  if (!opState?.kind) return null

  const kindLabel =
    opState.kind === 'merge'
      ? t('op.merge')
      : opState.kind === 'rebase'
        ? t('op.rebase')
        : opState.kind === 'cherry-pick'
          ? t('op.cherryPick')
          : t('op.revert')

  const run = (fn: () => Promise<void>): void => {
    setBusy(true)
    void fn().finally(() => setBusy(false))
  }

  const conflictCount = opState.conflicts.length

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">
      <span className="font-medium">
        {tf('op.inProgress', { kind: kindLabel })}
        {opState.kind === 'rebase' &&
          opState.rebaseCurrent != null &&
          opState.rebaseTotal != null &&
          ` · ${tf('op.rebaseProgress', { current: opState.rebaseCurrent, total: opState.rebaseTotal })}`}
      </span>
      {conflictCount > 0 && (
        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-medium text-amber-300">
          {tf('op.conflicts', { n: conflictCount })}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-amber-200/70">{t('op.resolveHint')}</span>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          className="rounded bg-emerald-600 px-2 py-1 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          disabled={busy}
          onClick={() => run(opContinue)}
        >
          {t('op.continue')}
        </button>
        {opState.kind === 'rebase' && (
          <button
            className="rounded border border-amber-400/40 px-2 py-1 text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
            disabled={busy}
            onClick={() => run(opSkip)}
          >
            {t('op.skip')}
          </button>
        )}
        <button
          className="rounded bg-rose-600 px-2 py-1 font-medium text-white hover:bg-rose-500 disabled:opacity-50"
          disabled={busy}
          onClick={() => run(opAbort)}
        >
          {t('op.abort')}
        </button>
      </div>
    </div>
  )
})
