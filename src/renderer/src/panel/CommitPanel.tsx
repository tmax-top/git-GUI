import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faWandMagicSparkles,
  faSpinner,
  faPlus,
  faMinus,
  faRotateLeft,
  faXmark,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons'
import { useApp, fileGroups, currentCommit, errText } from '../store'
import { t, tf } from '../i18n'
import { fullDate, statusLetter } from '../utils/format'
import { btnPrimary } from '../components/Modal'
import { Tip } from '../components/Tooltip'
import type { StatusFileDto } from '@shared/ipc'
import type { DiffFile } from '@shared/diff'

/** One-letter status shown in the changed-file list of a commit. */
function diffLetter(f: DiffFile): string {
  return f.status === 'new' ? 'A' : f.status === 'deleted' ? 'D' : f.status === 'renamed' ? 'R' : 'M'
}

function diffLetterColor(f: DiffFile): string {
  return f.status === 'new'
    ? 'text-emerald-400'
    : f.status === 'deleted'
      ? 'text-rose-400'
      : f.status === 'renamed'
        ? 'text-amber-400'
        : 'text-sky-400'
}

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

  const iconBtn = 'flex items-center rounded p-1 leading-none hover:bg-zinc-700'
  const icon = 'h-3.5 w-3.5'

  return (
    <div
      className={`group relative flex cursor-pointer items-center gap-1.5 px-2 py-1 text-xs hover:bg-zinc-800/70 ${
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
      {/* Actions float over the row instead of reserving width, so long paths
          can use the whole panel and still truncate at the real edge. */}
      <span className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded border border-zinc-800/60 bg-zinc-950 px-1 opacity-0 shadow-sm transition group-focus-within:opacity-100 group-hover:opacity-100">
        {variant !== 'staged' && (
          <Tip label={t('panel.stageTip')}>
            <button
              className={`${iconBtn} text-emerald-400 hover:bg-emerald-900/60`}
              aria-label={t('panel.stageTip')}
              onClick={(e) => {
                e.stopPropagation()
                void stage([file.path])
              }}
            >
              <FontAwesomeIcon icon={faPlus} className={icon} />
            </button>
          </Tip>
        )}
        {variant === 'staged' && (
          <Tip label={t('panel.unstageTip')}>
            <button
              className={`${iconBtn} text-amber-400 hover:bg-amber-900/60`}
              aria-label={t('panel.unstageTip')}
              onClick={(e) => {
                e.stopPropagation()
                void unstage([file.path])
              }}
            >
              <FontAwesomeIcon icon={faMinus} className={icon} />
            </button>
          </Tip>
        )}
        {variant !== 'staged' && (
          <Tip label={variant === 'untracked' ? t('panel.cleanTip') : t('panel.discardTip')}>
            <button
              className={`${iconBtn} text-rose-400 hover:bg-rose-900/60`}
              aria-label={variant === 'untracked' ? t('panel.cleanTip') : t('panel.discardTip')}
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
                    if (variant === 'untracked') await clean([file.path])
                    else await discard([file.path])
                  }
                })
              }}
            >
              <FontAwesomeIcon
                icon={variant === 'untracked' ? faXmark : faRotateLeft}
                className={icon}
              />
            </button>
          </Tip>
        )}
        {variant === 'untracked' && (
          <Tip label={t('panel.ignoreTip')}>
            <button
              className={`${iconBtn} text-zinc-400 hover:bg-zinc-700`}
              aria-label={t('panel.ignoreTip')}
              onClick={(e) => {
                e.stopPropagation()
                void ignore(file.path)
              }}
            >
              <FontAwesomeIcon icon={faArrowRight} className={icon} />
            </button>
          </Tip>
        )}
      </span>
    </div>
  )
}

type IconProp = React.ComponentProps<typeof FontAwesomeIcon>['icon']

/** Small icon button used for the bulk actions in a section header. */
function BulkBtn(props: {
  icon: IconProp
  label: string
  tone: string
  onClick: () => void
}): React.JSX.Element {
  return (
    <Tip label={props.label}>
      <button
        className={`rounded p-1 leading-none opacity-50 transition hover:bg-zinc-700 group-hover:opacity-100 ${props.tone}`}
        aria-label={props.label}
        onClick={props.onClick}
      >
        <FontAwesomeIcon icon={props.icon} className="h-3 w-3" />
      </button>
    </Tip>
  )
}

function Section(props: {
  title: string
  count: number
  color: string
  children: React.ReactNode
  defaultOpen?: boolean
  /** Tooltip explaining what this group of files means. */
  hint?: string
  /** Bulk actions rendered at the right edge of the header. */
  actions?: React.ReactNode
}): React.JSX.Element {
  const [open, setOpen] = useState(props.defaultOpen ?? true)
  return (
    <div>
      <div className="group flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide hover:bg-zinc-900">
        <button
          className="flex min-w-0 flex-1 items-center gap-1 text-left"
          onClick={() => setOpen((v) => !v)}
          title={props.hint}
        >
          <span className="text-zinc-500">{open ? '▾' : '▸'}</span>
          <span className={props.color}>{props.title}</span>
          <span className="text-zinc-600">({props.count})</span>
        </button>
        {props.count > 0 && props.actions}
      </div>
      {open && <div>{props.count === 0 ? <div className="px-3 py-1 text-[11px] text-zinc-600">{t('left.empty')}</div> : props.children}</div>}
    </div>
  )
}

export function CommitPanel(props: { width: number }): React.JSX.Element {
  const status = useApp((s) => s.status)
  const selection = useApp((s) => s.selection)
  const refs = useApp((s) => s.refs)
  const commits = useApp((s) => s.commits)
  const selectWip = useApp((s) => s.selectWip)
  const selectCommit = useApp((s) => s.selectCommit)
  const doCommit = useApp((s) => s.doCommit)
  const exportPatch = useApp((s) => s.exportPatch)
  const openPatchModal = useApp((s) => s.openPatchModal)
  const repoPath = useApp((s) => s.repoPath)
  const openSettings = useApp((s) => s.openSettings)
  const stage = useApp((s) => s.stage)
  const unstage = useApp((s) => s.unstage)
  const discard = useApp((s) => s.discard)
  const clean = useApp((s) => s.clean)
  const setConfirm = useApp((s) => s.setConfirm)
  const diffFiles = useApp((s) => s.diffFiles)
  const commitDiffFile = useApp((s) => s.commitDiffFile)
  const selectCommitDiffFile = useApp((s) => s.selectCommitDiffFile)

  const [message, setMessage] = useState('')
  const [amend, setAmend] = useState(false)
  const [coName, setCoName] = useState('')
  const [coEmail, setCoEmail] = useState('')
  const [committing, setCommitting] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  const handleAiGenerate = async (): Promise<void> => {
    if (!repoPath || aiLoading) return
    const settings = useApp.getState().settings
    const hasKey = Boolean(settings.aiApiKey?.trim())
    const isLocal = Boolean(settings.aiApiUrl?.includes('localhost') || settings.aiApiUrl?.includes('127.0.0.1'))
    if (!hasKey && !isLocal) {
      useApp.setState({
        error: t('panel.aiNoConfig')
      })
      openSettings('ai')
      return
    }

    setAiLoading(true)
    try {
      const generated = await window.api.aiGenerateCommitMsg({
        repoPath,
        draft: message.trim() || undefined
      })
      if (generated) {
        setMessage(generated)
      }
    } catch (err) {
      useApp.setState({ error: errText(err) })
    } finally {
      setAiLoading(false)
    }
  }

  const groups = fileGroups(status)
  const stagedCount = groups.staged.length
  const stagedPaths = groups.staged.map((f) => f.path)
  const changePaths = groups.changes.map((f) => f.path)
  const untrackedPaths = groups.untracked.map((f) => f.path)

  const discardAll = (): void => {
    setConfirm({
      title: t('panel.discardAll'),
      body: tf('panel.discardAllConfirm', { n: changePaths.length }),
      confirmLabel: t('common.confirm'),
      danger: true,
      onConfirm: async () => {
        await discard(changePaths)
      }
    })
  }

  const cleanAll = (): void => {
    setConfirm({
      title: t('panel.cleanAll'),
      body: tf('panel.cleanAllConfirm', { n: untrackedPaths.length }),
      confirmLabel: t('common.confirm'),
      danger: true,
      onConfirm: async () => {
        await clean(untrackedPaths)
      }
    })
  }

  if (selection.kind === 'commit') {
    const commit = currentCommit(commits, selection.oid)
    const activePath = commitDiffFile ?? diffFiles[0]?.path
    return (
      <aside
        className="flex shrink-0 flex-col border-l border-zinc-800 bg-zinc-950 text-sm"
        style={{ width: props.width }}
      >
        <div className="max-h-[45%] shrink-0 overflow-auto border-b border-zinc-800 px-3 py-2">
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
                        {p.slice(0, 8)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {commit.body && (
                <pre className="mt-2 whitespace-pre-wrap text-xs text-zinc-500">{commit.body}</pre>
              )}
              <div className="mt-3 border-t border-zinc-800/80 pt-2">
                <Tip label={t('patch.exportCommit')}>
                  <button
                    className="rounded bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-700 font-medium"
                    onClick={() => void exportPatch(commit.oid)}
                    data-testid="commit-export-patch-btn"
                  >
                    📥 {t('patch.export')}
                  </button>
                </Tip>
              </div>
            </>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center border-b border-zinc-800 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            {tf('commit.files', { n: diffFiles.length })}
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {diffFiles.map((f) => {
              const active = f.path === activePath
              const added = f.hunks.reduce(
                (n, h) => n + h.lines.filter((l) => l.type === '+').length,
                0
              )
              const removed = f.hunks.reduce(
                (n, h) => n + h.lines.filter((l) => l.type === '-').length,
                0
              )
              return (
                <button
                  key={f.path}
                  className={`flex w-full items-center gap-1.5 px-3 py-1 text-left text-xs ${
                    active ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800/60'
                  }`}
                  title={f.path}
                  onClick={() => selectCommitDiffFile(f.path)}
                  data-testid={`commit-file-${f.path}`}
                >
                  <span className={`w-3 shrink-0 font-mono font-bold ${diffLetterColor(f)}`}>
                    {diffLetter(f)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{f.path}</span>
                  {added > 0 && (
                    <span className="shrink-0 font-mono text-[10px] text-emerald-500">+{added}</span>
                  )}
                  {removed > 0 && (
                    <span className="shrink-0 font-mono text-[10px] text-rose-500">-{removed}</span>
                  )}
                </button>
              )
            })}
          </div>
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
    <aside
      className="flex shrink-0 flex-col border-l border-zinc-800 bg-zinc-950"
      style={{ width: props.width }}
    >
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-1.5 text-xs bg-zinc-900/40">
        <Tip label={t('panel.exportWipTip')}>
          <button
            className="text-xs text-sky-400 hover:underline"
            onClick={() => void exportPatch()}
            data-testid="wip-export-patch-btn"
          >
            {t('patch.exportWip')}
          </button>
        </Tip>
        <Tip label={t('panel.applyPatchTip')}>
          <button
            className="text-xs text-sky-400 hover:underline"
            onClick={openPatchModal}
            data-testid="wip-apply-patch-btn"
          >
            {t('patch.apply')}
          </button>
        </Tip>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <Section
          title={t('panel.staged')}
          count={stagedCount}
          color="text-emerald-400"
          hint={t('panel.stagedTip')}
          actions={
            <BulkBtn
              icon={faMinus}
              label={tf('panel.unstageAllTip', { n: stagedCount })}
              tone="text-amber-400 hover:bg-amber-900/60"
              onClick={() => void unstage(stagedPaths)}
            />
          }
        >
          {groups.staged.map((f) => (
            <FileRow key={`s:${f.path}`} file={f} variant="staged" />
          ))}
        </Section>
        <Section
          title={t('panel.changes')}
          count={groups.changes.length}
          color="text-amber-400"
          hint={t('panel.changesTip')}
          actions={
            <>
              <BulkBtn
                icon={faPlus}
                label={tf('panel.stageAllTip', { n: changePaths.length })}
                tone="text-emerald-400 hover:bg-emerald-900/60"
                onClick={() => void stage(changePaths)}
              />
              <BulkBtn
                icon={faRotateLeft}
                label={tf('panel.discardAllTip', { n: changePaths.length })}
                tone="text-rose-400 hover:bg-rose-900/60"
                onClick={discardAll}
              />
            </>
          }
        >
          {groups.changes.map((f) => (
            <FileRow key={`c:${f.path}`} file={f} variant="change" />
          ))}
        </Section>
        <Section
          title={t('panel.newFiles')}
          count={groups.untracked.length}
          color="text-sky-400"
          hint={t('panel.newFilesTip')}
          actions={
            <>
              <BulkBtn
                icon={faPlus}
                label={tf('panel.stageAllTip', { n: untrackedPaths.length })}
                tone="text-emerald-400 hover:bg-emerald-900/60"
                onClick={() => void stage(untrackedPaths)}
              />
              <BulkBtn
                icon={faXmark}
                label={tf('panel.cleanAllTip', { n: untrackedPaths.length })}
                tone="text-rose-400 hover:bg-rose-900/60"
                onClick={cleanAll}
              />
            </>
          }
        >
          {groups.untracked.map((f) => (
            <FileRow key={`u:${f.path}`} file={f} variant="untracked" />
          ))}
        </Section>
      </div>

      <div className="border-t border-zinc-800 p-2">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-medium text-zinc-400">{t('panel.message')}</span>
          <Tip label={t('panel.aiHint')}>
            <button
              type="button"
              className="flex items-center gap-1 rounded bg-gradient-to-r from-emerald-600/20 to-sky-600/20 border border-emerald-500/30 px-2 py-0.5 text-[11px] text-emerald-300 transition hover:from-emerald-600/30 hover:to-sky-600/30 hover:border-emerald-400 hover:text-emerald-200 disabled:opacity-50 cursor-pointer"
              disabled={aiLoading || !repoPath}
              onClick={() => void handleAiGenerate()}
              data-testid="ai-generate-commit-btn"
            >
              <FontAwesomeIcon
                icon={aiLoading ? faSpinner : faWandMagicSparkles}
                className={`h-3 w-3 ${aiLoading ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`}
              />
              <span>{aiLoading ? t('panel.aiGenerating') : t('panel.aiGenerate')}</span>
            </button>
          </Tip>
        </div>
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
          <label className="flex cursor-pointer items-center gap-1" title={t('panel.amendTip')}>
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

        <Tip
          className="mt-2 block w-full"
          label={
            stagedCount === 0 && !amend
              ? t('panel.nothingStaged')
              : tf('panel.commitTip', { n: stagedCount })
          }
        >
          <button
            className={`${btnPrimary()} w-full`}
            disabled={(!message.trim() && !amend) || committing || (stagedCount === 0 && !amend)}
            onClick={() => void submit()}
          >
            {committing ? t('panel.committing') : t('panel.commit')}
          </button>
        </Tip>
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
