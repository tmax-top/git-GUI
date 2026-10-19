import { useEffect, useState } from 'react'
import type { RebaseOpDto } from '@shared/ipc'
import { t, tf, type MessageKey } from '../i18n'
import { btnGhost, btnPrimary, Modal } from '../components/Modal'
import { useApp } from '../store'

type RowAction = RebaseOpDto['action']

interface Row {
  oid: string
  shortOid: string
  subject: string
  action: RowAction
  message: string
}

const ACTIONS: readonly RowAction[] = ['pick', 'reword', 'squash', 'fixup', 'drop']

const ACTION_LABEL_KEY: Record<RowAction, MessageKey> = {
  pick: 'rebase.actionPick',
  reword: 'rebase.actionReword',
  squash: 'rebase.actionSquash',
  fixup: 'rebase.actionFixup',
  drop: 'rebase.actionDrop'
}

export function RebaseDialog(): React.JSX.Element | null {
  const dialog = useApp((s) => s.rebaseDialog)
  const close = useApp((s) => s.closeRebaseDialog)
  if (!dialog) return null
  // Keyed by base so each plan starts from a clean slate (no stale rows/busy).
  return (
    <RebasePlan
      key={dialog.base}
      base={dialog.base}
      baseShort={dialog.baseShort}
      baseSubject={dialog.baseSubject}
      onClose={close}
    />
  )
}

function RebasePlan(props: {
  base: string
  baseShort: string
  baseSubject: string
  onClose: () => void
}): React.JSX.Element {
  const repoPath = useApp((s) => s.repoPath)
  const rebaseInteractive = useApp((s) => s.rebaseInteractive)
  const storeError = useApp((s) => s.error)

  // `rows === null` means "still loading" — set only from async callbacks below.
  const [rows, setRows] = useState<Row[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { base } = props

  useEffect(() => {
    if (!repoPath) return
    let cancelled = false
    void window.api
      .gitRebaseRange({ repoPath, base })
      .then((commits) => {
        if (cancelled) return
        setRows(
          commits.map((c) => ({
            oid: c.oid,
            shortOid: c.shortOid,
            subject: c.subject,
            action: 'pick' as RowAction,
            message: c.subject
          }))
        )
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setLoadError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [repoPath, base])

  function setAction(oid: string, action: RowAction): void {
    setRows((prev) => (prev ? prev.map((r) => (r.oid === oid ? { ...r, action } : r)) : prev))
  }

  function setMessage(oid: string, message: string): void {
    setRows((prev) => (prev ? prev.map((r) => (r.oid === oid ? { ...r, message } : r)) : prev))
  }

  function move(index: number, delta: number): void {
    setRows((prev) => {
      if (!prev) return prev
      const next = index + delta
      if (next < 0 || next >= prev.length) return prev
      const copy = [...prev]
      ;[copy[index], copy[next]] = [copy[next], copy[index]]
      return copy
    })
  }

  async function submit(): Promise<void> {
    if (!rows) return
    const missing = rows.find((r) => r.action === 'reword' && !r.message.trim())
    if (missing) {
      setSubmitError(t('rebase.rewordNeedsMessage').replace('{short}', missing.shortOid))
      return
    }
    const ops: RebaseOpDto[] = rows.map((r) => {
      const op: RebaseOpDto = { oid: r.oid, action: r.action }
      if (r.action === 'reword') op.message = r.message.trim()
      return op
    })
    setBusy(true)
    setSubmitError(null)
    try {
      await rebaseInteractive(base, ops)
      // Success or mid-rebase conflict: either way the banner/graph takes over.
      props.onClose()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const allDropped = rows !== null && rows.length > 0 && rows.every((r) => r.action === 'drop')
  // A reword without a new message is invalid — surface it on the button too.
  const rewordMissing = rows?.some((r) => r.action === 'reword' && !r.message.trim()) ?? false
  const canSubmit = !busy && !!rows && rows.length > 0 && !allDropped && !rewordMissing

  return (
    <Modal
      title={t('rebase.title')}
      onClose={busy ? () => {} : props.onClose}
      footer={
        <>
          <button className={btnGhost()} onClick={props.onClose} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button
            className={btnPrimary()}
            onClick={() => void submit()}
            disabled={!canSubmit}
          >
            {busy ? t('rebase.starting') : t('rebase.start')}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="text-xs text-zinc-400">
          {t('rebase.base')}: <span className="font-mono text-zinc-300">{props.baseShort}</span>{' '}
          <span className="text-zinc-500">{props.baseSubject}</span>
        </div>

        {rows === null && !loadError && (
          <div className="py-6 text-center text-zinc-500">{t('rebase.loading')}</div>
        )}
        {loadError && <div className="py-4 text-center text-xs text-rose-400">{loadError}</div>}
        {submitError && <div className="text-xs text-rose-400">{submitError}</div>}
        {!submitError && storeError && <div className="text-xs text-rose-400">{storeError}</div>}

        {rows && rows.length === 0 && (
          <div className="py-6 text-center text-zinc-500">{t('rebase.empty')}</div>
        )}

        {rows && rows.length > 0 && (
          <>
            <div className="text-xs text-zinc-400">
              {tf('rebase.rangeSummary', { n: rows.length, base: props.baseShort })}
            </div>
            <ul className="divide-y divide-zinc-800 rounded border border-zinc-800">
              {rows.map((row, i) => (
                <li key={row.oid} className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex shrink-0 flex-col gap-0.5">
                      <button
                        className="rounded px-1 text-[10px] leading-3 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30"
                        onClick={() => move(i, -1)}
                        disabled={i === 0 || busy}
                        aria-label={t('rebase.up')}
                        title={t('rebase.up')}
                      >
                        ▲
                      </button>
                      <button
                        className="rounded px-1 text-[10px] leading-3 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30"
                        onClick={() => move(i, 1)}
                        disabled={i === rows.length - 1 || busy}
                        aria-label={t('rebase.down')}
                        title={t('rebase.down')}
                      >
                        ▼
                      </button>
                    </div>
                    <span className="w-16 shrink-0 font-mono text-xs text-zinc-500">
                      {row.shortOid}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-xs ${
                        row.action === 'drop' ? 'text-zinc-600 line-through' : 'text-zinc-200'
                      }`}
                    >
                      {row.subject}
                    </span>
                    <select
                      className="shrink-0 rounded border border-zinc-700 bg-zinc-950 px-1.5 py-1 text-xs text-zinc-200 outline-none focus:border-emerald-600"
                      value={row.action}
                      onChange={(e) => setAction(row.oid, e.target.value as RowAction)}
                      disabled={busy}
                      aria-label={t('rebase.columnAction')}
                    >
                      {ACTIONS.map((a) => (
                        <option key={a} value={a}>
                          {t(ACTION_LABEL_KEY[a])}
                        </option>
                      ))}
                    </select>
                  </div>
                  {row.action === 'reword' && (
                    <input
                      className="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-emerald-600"
                      value={row.message}
                      placeholder={t('rebase.messagePlaceholder')}
                      onChange={(e) => setMessage(row.oid, e.target.value)}
                      disabled={busy}
                      aria-label={t('rebase.message')}
                    />
                  )}
                </li>
              ))}
            </ul>
            {allDropped && <div className="text-xs text-amber-400">{t('rebase.allDropped')}</div>}
          </>
        )}
      </div>
    </Modal>
  )
}
