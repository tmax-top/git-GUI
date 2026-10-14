import { useState } from 'react'
import { useApp, fileGroups, currentCommit } from '../store'
import { t, tf } from '../i18n'
import { fullDate, statusLetter } from '../utils/format'
import { btnPrimary } from '../components/Modal'
import type { StatusFileDto } from '@shared/ipc'

function FileRow(props: {
  file: StatusFileDto
  variant: 'staged' | 'change' | 'untracked'
}): React.JSX.Element {
  const { file, variant } = props
  const selection = useApp((s) => s.selection)
  const selectFile = useApp((s) => s.selectFile)
  const stage = useApp((s) => s.stage)
  const unstage = useApp((s) => s.unstage)
  const discard = useApp((s) => s.discard)
  const clean = useApp((s) => s.clean)
  const ignore = useApp((s) => s.ignore)
  const setConfirm = useApp((s) => s.setConfirm)

  const selected =
    selection.kind === 'file' && selection.path === file.path && selection.cached === (variant === 'staged')

  const letter = statusLetter(file)
  const letterColor =
    letter.includes('A') || letter === 'U'
      ? 'text-emerald-400'
      : letter.includes('D')
        ? 'text-rose-400'
        : letter.includes('R') || letter.includes('C')
          ? 'text-amber-400'
          : 'text-sky-400'

  const open = (): void =>
    selectFile(file.path, variant === 'staged', variant === 'untracked')

  const iconBtn = 'rounded px-1 text-[11px] leading-none opacity-0 group-hover:opacity-100'

  return (
    <div
      className={`group flex cursor-pointer items-center gap-1.5 px-2 py-1 text-xs hover:bg-zinc-800/70 ${
        selected ? 'bg-zinc-800' : ''
      }`}
      onClick={open}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') open()
      }}
    >
      <span className={`w-4 shrink-0 font-mono font-bold ${letterColor}`}>{letter}</span>
      <span className="min-w-0 flex-1 truncate" title={file.path}>
        {file.path}
        {file.origPath && <span className="text-zinc-600"> ← {file.origPath}</span>}
      </span>
      <span className="flex shrink-0 gap-1">
        {variant !== 'staged' && (
          <button
            className={`${iconBtn} text-emerald-400 hover:bg-emerald-900/60`}
            title={t('panel.stage')}
            onClick={(e) => {
              e.stopPropagation()
              void stage([file.path])
            }}
          >
            ＋
          </button>
        )}
        {variant === 'staged' && (
          <button
            className={`${iconBtn} text-amber-400 hover:bg-amber-900/60`}
            title={t('panel.unstage')}
            onClick={(e) => {
              e.stopPropagation()
              void unstage([file.path])
            }}
          >
            －
          </button>
        )}
        {variant !== 'staged' && (
          <button
            className={`${iconBtn} text-rose-400 hover:bg-rose-900/60`}
            title={variant === 'untracked' ? t('panel.clean') : t('panel.discard')}
            onClick={(e) => {
              e.stopPropagation()
              setConfirm({
                title: variant === 'untracked' ? t('panel.clean') : t('panel.discard'),
                body:
                  variant === 'untracked'
                    ? tf('panel.cleanConfirm', { path: file.path })
                    : tf('panel.discardConfirm', { path: file.path }),
                confirmLabel: t('common.confirm'),
                danger: true,
                onConfirm: async () => {
                  if (variant === 'untracked') await clean(file.path)
                  else await discard(file.path)
                }
              })
            }}
          >
            {variant === 'untracked' ? '✕' : '⟲'}
          </button>
        )}
        {variant === 'untracked' && (
          <button
            className={`${iconBtn} text-zinc-400 hover:bg-zinc-700`}
            title={t('panel.ignore')}
            onClick={(e) => {
              e.stopPropagation()
              void ignore(file.path)
            }}
          >
            →
          </button>
        )}
      </span>
    </div>
  )
}

function Section(props: {
  title: string
  count: number
  color: string
  children: React.ReactNode
  defaultOpen?: boolean
}): React.JSX.Element {
  const [open, setOpen] = useState(props.defaultOpen ?? true)
  return (
    <div>
      <button
        className="flex w-full items-center gap-1 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide hover:bg-zinc-900"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-zinc-500">{open ? '▾' : '▸'}</span>
        <span className={props.color}>{props.title}</span>
        <span className="text-zinc-600">({props.count})</span>
      </button>
      {open && <div>{props.count === 0 ? <div className="px-3 py-1 text-[11px] text-zinc-600">{t('left.empty')}</div> : props.children}</div>}
    </div>
  )
}

export function CommitPanel(): React.JSX.Element {
  const status = useApp((s) => s.status)
  const selection = useApp((s) => s.selection)
  const refs = useApp((s) => s.refs)
  const commits = useApp((s) => s.commits)
  const selectWip = useApp((s) => s.selectWip)
  const selectCommit = useApp((s) => s.selectCommit)
  const doCommit = useApp((s) => s.doCommit)

  const [message, setMessage] = useState('')
  const [amend, setAmend] = useState(false)
  const [coName, setCoName] = useState('')
  const [coEmail, setCoEmail] = useState('')
  const [committing, setCommitting] = useState(false)

  const groups = fileGroups(status)
  const stagedCount = groups.staged.length

  if (selection.kind === 'commit') {
    const commit = currentCommit(commits, selection.oid)
    return (
      <aside className="flex w-80 shrink-0 flex-col overflow-auto border-l border-zinc-800 bg-zinc-950 text-sm">
        <div className="border-b border-zinc-800 px-3 py-2">
          <button className="mb-2 text-xs text-zinc-400 hover:text-emerald-400" onClick={selectWip}>
            {t('commit.backToWip')}
          </button>
          {commit && (
            <>
              <div className="text-sm font-medium text-zinc-100">{commit.subject}</div>
              <div className="mt-2 space-y-1 text-xs text-zinc-400">
                <div>
                  <span className="text-zinc-600">{t('commit.author')}: </span>
                  {commit.authorName} &lt;{commit.authorEmail}&gt;
                </div>
                <div>
                  <span className="text-zinc-600">{t('commit.date')}: </span>
                  {fullDate(commit.committerTime)}
                </div>
                <div className="font-mono">
                  <span className="text-zinc-600">{commit.shortOid}</span>
                </div>
                {commit.parents.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-zinc-600">{t('commit.parents')}:</span>
                    {commit.parents.map((p) => (
                      <button
                        key={p}
                        className="rounded bg-zinc-800 px-1 font-mono text-sky-400 hover:bg-zinc-700"
                        onClick={() => selectCommit(p)}
                      >
                        {p.slice(0, 7)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {commit.body && (
                <pre className="mt-2 whitespace-pre-wrap text-xs text-zinc-500">{commit.body}</pre>
              )}
            </>
          )}
        </div>
      </aside>
    )
  }

  const submit = async (): Promise<void> => {
    if (!message.trim() && !amend) return
    setCommitting(true)
    let finalMsg = message.trim()
    if (coName.trim()) {
      const trailer = `Co-authored-by: ${coName.trim()}${coEmail.trim() ? ` <${coEmail.trim()}>` : ''}`
      finalMsg = finalMsg ? `${finalMsg}\n\n${trailer}` : trailer
    }
    const ok = await doCommit(finalMsg || `Amend: ${commits[0]?.subject ?? ''}`, amend)
    if (ok) {
      setMessage('')
      setAmend(false)
      setCoName('')
      setCoEmail('')
    }
    setCommitting(false)
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950">
      <div className="min-h-0 flex-1 overflow-auto">
        <Section title={t('panel.staged')} count={stagedCount} color="text-emerald-400">
          {groups.staged.map((f) => (
            <FileRow key={`s:${f.path}`} file={f} variant="staged" />
          ))}
        </Section>
        <Section title={t('panel.changes')} count={groups.changes.length} color="text-amber-400">
          {groups.changes.map((f) => (
            <FileRow key={`c:${f.path}`} file={f} variant="change" />
          ))}
        </Section>
        <Section title={t('panel.newFiles')} count={groups.untracked.length} color="text-sky-400">
          {groups.untracked.map((f) => (
            <FileRow key={`u:${f.path}`} file={f} variant="untracked" />
          ))}
        </Section>
      </div>

      <div className="border-t border-zinc-800 p-2">
        <textarea
          className="h-20 w-full resize-none rounded border border-zinc-800 bg-zinc-900 p-2 text-xs text-zinc-100 outline-none focus:border-emerald-600"
          placeholder={t('panel.message')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && (message.trim() || amend)) {
              void submit()
            }
          }}
        />
        <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400">
          <label className="flex cursor-pointer items-center gap-1">
            <input
              type="checkbox"
              checked={amend}
              onChange={(e) => setAmend(e.target.checked)}
              className="accent-emerald-600"
            />
            {t('panel.amend')}
          </label>
          <span className="flex-1" />
          <span>{tf('status.staged', { n: stagedCount })}</span>
        </div>

        <details className="mt-1 text-[11px] text-zinc-500">
          <summary className="cursor-pointer">{t('panel.coauthor')}</summary>
          <div className="mt-1 flex gap-1">
            <input
              className="w-1/2 rounded border border-zinc-800 bg-zinc-900 px-1.5 py-1 text-xs outline-none focus:border-emerald-600"
              placeholder={t('panel.coauthorName')}
              value={coName}
              onChange={(e) => setCoName(e.target.value)}
            />
            <input
              className="w-1/2 rounded border border-zinc-800 bg-zinc-900 px-1.5 py-1 text-xs outline-none focus:border-emerald-600"
              placeholder={t('panel.coauthorEmail')}
              value={coEmail}
              onChange={(e) => setCoEmail(e.target.value)}
            />
          </div>
        </details>

        <button
          className={`${btnPrimary()} mt-2 w-full`}
          disabled={(!message.trim() && !amend) || committing || (stagedCount === 0 && !amend)}
          onClick={() => void submit()}
          title={stagedCount === 0 && !amend ? t('panel.nothingStaged') : undefined}
        >
          {committing ? t('panel.committing') : t('panel.commit')}
        </button>
        {stagedCount === 0 && !amend && (
          <div className="mt-1 text-center text-[10px] text-zinc-600">{t('panel.nothingStaged')}</div>
        )}
      </div>

      {refs?.current && (
        <div className="border-t border-zinc-800 px-2 py-1 text-[10px] text-zinc-600">
          {refs.current}
        </div>
      )}
    </aside>
  )
}
