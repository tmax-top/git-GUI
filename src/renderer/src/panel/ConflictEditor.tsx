import { useMemo, useState } from 'react'
import { parseConflictMarkers, renderResolved, type ConflictChoice } from '@shared/conflict'
import type { ConflictFileDto } from '@shared/ipc'
import { t, tf } from '../i18n'
import { btnDanger, btnGhost, btnPrimary } from '../components/Modal'
import { useApp } from '../store'

/**
 * Three-way conflict editor.
 *
 * Renders each conflict region with ours/theirs side by side plus the merged
 * result in an editable textarea. Manual edits freeze region-level picking
 * (to avoid silently discarding user typing); "Accept ours/theirs" remain
 * available as a whole-file reset.
 */
export function ConflictEditor(): React.JSX.Element | null {
  const conflict = useApp((s) => s.conflict)
  const loading = useApp((s) => s.conflictLoading)

  if (loading && !conflict) return <div className="p-4 text-sm text-zinc-500">{t('conflict.loading')}</div>
  if (!conflict) return null
  // Keyed by path so local edits reset whenever a different file arrives.
  return <ConflictEditorInner key={conflict.path} conflict={conflict} />
}

function ConflictEditorInner(props: { conflict: ConflictFileDto }): React.JSX.Element {
  const conflict = props.conflict
  const resolveConflict = useApp((s) => s.resolveConflict)
  const acceptConflict = useApp((s) => s.acceptConflict)

  const parsed = useMemo(
    () => (conflict.binary ? null : parseConflictMarkers(conflict.worktree)),
    [conflict]
  )

  const [resolved, setResolved] = useState<string>(conflict.worktree)
  const [choices, setChoices] = useState<ConflictChoice[]>(() =>
    parsed
      ? parsed.segments
          .filter((s) => s.kind === 'conflict')
          .map(() => ({ type: 'ours' as const }))
      : []
  )
  const [edited, setEdited] = useState(false)
  const [busy, setBusy] = useState(false)

  // --- binary / no-worktree fallback: whole-file side pickers -------------
  if (conflict.binary) {
    return (
      <div className="border-t border-zinc-800 bg-zinc-900/40 p-4">
        <div className="mb-2 text-sm font-medium text-zinc-200">{t('conflict.title')}</div>
        <div className="mb-3 text-xs text-zinc-400">{t('conflict.binary')}</div>
        <div className="flex gap-2">
          <button className={btnGhost()} disabled={busy} onClick={() => void side('ours')}>
            {t('conflict.takeOurs')}
          </button>
          <button className={btnGhost()} disabled={busy} onClick={() => void side('theirs')}>
            {t('conflict.takeTheirs')}
          </button>
        </div>
      </div>
    )
  }

  async function side(s: 'ours' | 'theirs'): Promise<void> {
    setBusy(true)
    try {
      await acceptConflict(s)
    } finally {
      setBusy(false)
    }
  }

  function pick(index: number, choice: ConflictChoice): void {
    if (edited || !parsed) return
    const next = [...choices]
    next[index] = choice
    setChoices(next)
    setResolved(renderResolved(parsed.segments, next))
  }

  function pickAll(type: 'ours' | 'theirs'): void {
    if (!parsed) return
    const next = parsed.segments
      .map((s) => (s.kind === 'conflict' ? ({ type } as ConflictChoice) : null))
      .filter((c): c is ConflictChoice => c !== null)
    setChoices(next)
    setResolved(renderResolved(parsed.segments, next))
    setEdited(false)
  }

  async function markResolved(): Promise<void> {
    setBusy(true)
    try {
      await resolveConflict(resolved)
    } finally {
      setBusy(false)
    }
  }

  const conflictSegs = parsed?.segments.filter((s) => s.kind === 'conflict') ?? []
  const stillHasMarkers = resolved.includes('<<<<<<<') || resolved.includes('>>>>>>>')

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-zinc-800">
      {/* toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-800 bg-zinc-900/60 px-3 py-2">
        <span className="text-xs font-medium text-amber-400">{t('conflict.title')}</span>
        <span className="text-[11px] text-zinc-500">
          {tf('conflict.regions', { n: conflictSegs.length })}
        </span>
        <span className="flex-1" />
        <button className={btnGhost()} disabled={busy || edited} onClick={() => pickAll('ours')}>
          {t('conflict.acceptAllOurs')}
        </button>
        <button className={btnGhost()} disabled={busy || edited} onClick={() => pickAll('theirs')}>
          {t('conflict.acceptAllTheirs')}
        </button>
        <button className={btnPrimary()} disabled={busy} onClick={() => void markResolved()}>
          {busy ? t('conflict.resolving') : t('conflict.markResolved')}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {/* per-region side-by-side */}
        {conflictSegs.length > 0 && !edited && (
          <div className="space-y-3 p-3">
            {conflictSegs.map((seg, i) => {
              if (seg.kind !== 'conflict') return null
              const sel = choices[i]?.type ?? 'ours'
              return (
                <div key={i} className="rounded border border-zinc-800">
                  <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/50 px-2 py-1.5">
                    <span className="text-[11px] text-zinc-500">{tf('conflict.region', { n: i + 1 })}</span>
                    <span className="flex-1" />
                    <button
                      className={`rounded px-2 py-0.5 text-[11px] ${
                        sel === 'ours'
                          ? 'bg-emerald-700 text-white'
                          : 'border border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                      }`}
                      onClick={() => pick(i, { type: 'ours' })}
                    >
                      {t('conflict.ours')}
                    </button>
                    <button
                      className={`rounded px-2 py-0.5 text-[11px] ${
                        sel === 'theirs'
                          ? 'bg-sky-700 text-white'
                          : 'border border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                      }`}
                      onClick={() => pick(i, { type: 'theirs' })}
                    >
                      {t('conflict.theirs')}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-zinc-800 text-xs">
                    <pre className="max-h-48 overflow-auto px-2 py-1.5 text-zinc-300">
                      <div className="mb-1 text-[10px] text-zinc-500">
                        {seg.oursLabel || t('conflict.ours')}
                      </div>
                      {seg.ours.join('\n') || <span className="text-zinc-600">{t('conflict.empty')}</span>}
                    </pre>
                    <pre className="max-h-48 overflow-auto px-2 py-1.5 text-zinc-300">
                      <div className="mb-1 text-[10px] text-zinc-500">
                        {seg.theirsLabel || t('conflict.theirs')}
                      </div>
                      {seg.theirs.join('\n') || <span className="text-zinc-600">{t('conflict.empty')}</span>}
                    </pre>
                  </div>
                  {seg.base && (
                    <div className="border-t border-zinc-800 px-2 py-1.5">
                      <div className="mb-1 text-[10px] text-zinc-500">{t('conflict.base')}</div>
                      <pre className="max-h-32 overflow-auto text-[11px] text-zinc-500">
                        {seg.base.join('\n')}
                      </pre>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* merged result textarea — editable once, freezes region picking */}
        <div className="flex flex-col p-3 pt-0">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[11px] text-zinc-500">{t('conflict.result')}</span>
            {edited && <span className="text-[10px] text-zinc-600">{t('conflict.manual')}</span>}
          </div>
          <textarea
            className="min-h-64 w-full flex-1 resize-y rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs leading-5 text-zinc-100 outline-none focus:border-emerald-600"
            value={resolved}
            spellCheck={false}
            onChange={(e) => {
              setResolved(e.target.value)
              setEdited(true)
            }}
            aria-label={t('conflict.result')}
          />
          {stillHasMarkers && (
            <div className="mt-2 flex items-center gap-2 text-[11px] text-amber-400">
              <span>{t('conflict.markersRemain')}</span>
              <button className={btnDanger()} disabled={busy} onClick={() => void markResolved()}>
                {t('conflict.forceMarkResolved')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
