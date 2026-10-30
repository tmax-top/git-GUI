import { useCallback, useMemo, useState } from 'react'
import { Modal, btnGhost, btnPrimary } from '../components/Modal'
import { t, tf } from '../i18n'
import { useApp } from '../store'

export function CreatePrDialog(): React.JSX.Element {
  const close = useApp((s) => s.closeCreatePr)
  const refs = useApp((s) => s.refs)
  const repoPath = useApp((s) => s.repoPath)
  const defaultBranch = useApp((s) => s.settings.defaultBranch) || 'main'
  const createPr = useApp((s) => s.createPr)
  const refreshStatus = useApp((s) => s.refreshStatus)

  const currentBranch = refs?.current ?? ''

  // A PR can only target branches that exist on the remote, so offer
  // refs/remotes/* (deduped across remotes) rather than local branches.
  const remoteBranches = useMemo(() => {
    const names = new Set<string>()
    for (const b of refs?.branches ?? []) {
      if (!b.isRemote) continue
      const slash = b.name.indexOf('/')
      if (slash < 0) continue
      names.add(b.name.slice(slash + 1))
    }
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [refs])

  /** short name → remote-tracking ref, e.g. "main" → "origin/main". */
  const refByShortName = useMemo(() => {
    const map = new Map<string, string>()
    for (const b of refs?.branches ?? []) {
      if (!b.isRemote) continue
      const slash = b.name.indexOf('/')
      if (slash < 0) continue
      const short = b.name.slice(slash + 1)
      if (!map.has(short)) map.set(short, b.name)
    }
    return map
  }, [refs])

  // Default head = the branch you're on (that's what you usually want to PR),
  // default base = the repo's default branch when it exists on the remote.
  const [sourceBranch, setSourceBranch] = useState(currentBranch || (remoteBranches[0] ?? ''))
  const [targetBranch, setTargetBranch] = useState(
    remoteBranches.includes(defaultBranch)
      ? defaultBranch
      : remoteBranches.includes('main')
        ? 'main'
        : (remoteBranches[0] ?? defaultBranch)
  )
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [draft, setDraft] = useState(false)
  const [autoDesc, setAutoDesc] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genNote, setGenNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  /** Fill the description with every commit in base..head, oldest first. */
  const generateDescription = useCallback(
    async (base: string, head: string): Promise<void> => {
      const from = refByShortName.get(base.trim()) ?? base.trim()
      const to = refByShortName.get(head.trim()) ?? head.trim()
      if (!repoPath || !from || !to || from === to) return
      setGenerating(true)
      try {
        const commits = await window.api.gitCommitRange({ repoPath, base: from, head: to })
        if (commits.length === 0) {
          setDescription('')
          setGenNote(t('pr.autoDescEmpty'))
        } else {
          setDescription(commits.map((c) => `- ${c.shortOid} ${c.subject}`).join('\n'))
          setGenNote('')
        }
      } catch (e) {
        setGenNote(e instanceof Error ? e.message : String(e))
      } finally {
        setGenerating(false)
      }
    },
    [repoPath, refByShortName]
  )

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!title.trim() || !sourceBranch.trim() || !targetBranch.trim() || submitting) return
    setSubmitting(true)
    try {
      await createPr({
        title: title.trim(),
        description: description.trim(),
        sourceBranch: sourceBranch.trim(),
        targetBranch: targetBranch.trim(),
        draft
      })
    } finally {
      setSubmitting(false)
    }
  }

  const footer = (
    <>
      <button className={btnGhost()} onClick={close} disabled={submitting}>
        {t('common.cancel')}
      </button>
      <button
        className={btnPrimary()}
        disabled={!title.trim() || submitting}
        onClick={handleSubmit}
        data-testid="create-pr-submit"
      >
        {submitting ? '…' : t('pr.new')}
      </button>
    </>
  )

  const inputClass =
    'rounded border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-sky-500 focus:outline-none'

  return (
    <Modal title={t('pr.createTitle')} onClose={close} footer={footer}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span>{tf('pr.remoteBranchCount', { n: remoteBranches.length })}</span>
            <button
              type="button"
              className="text-sky-400 hover:underline"
              onClick={() => void refreshStatus()}
            >
              {t('pr.refreshBranches')}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-zinc-400">
              <span>{t('pr.sourceBranch')}</span>
              <select
                className={inputClass}
                value={sourceBranch}
                onChange={(e) => {
                  const v = e.target.value
                  setSourceBranch(v)
                  if (autoDesc) void generateDescription(targetBranch, v)
                }}
                title={t('pr.branchFromRemote')}
                required
                data-testid="create-pr-source"
              >
                {sourceBranch && !remoteBranches.includes(sourceBranch) && (
                  <option value={sourceBranch}>{sourceBranch}</option>
                )}
                {remoteBranches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-zinc-400">
              <span>{t('pr.targetBranch')}</span>
              <select
                className={inputClass}
                value={targetBranch}
                onChange={(e) => {
                  const v = e.target.value
                  setTargetBranch(v)
                  if (autoDesc) void generateDescription(v, sourceBranch)
                }}
                title={t('pr.branchFromRemote')}
                required
                data-testid="create-pr-target"
              >
                {targetBranch && !remoteBranches.includes(targetBranch) && (
                  <option value={targetBranch}>{targetBranch}</option>
                )}
                {remoteBranches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <label className="flex flex-col gap-1 text-zinc-400">
          <span>{t('pr.prTitle')}</span>
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="feat: awesome feature"
            required
            autoFocus
            data-testid="create-pr-title"
          />
        </label>

        <div className="flex flex-col gap-1 text-zinc-400">
          <div className="flex items-center justify-between gap-2">
            <span>{t('pr.prDesc')}</span>
            <span className="flex items-center gap-2 text-[11px]">
              <label className="flex cursor-pointer items-center gap-1 text-zinc-400">
                <input
                  type="checkbox"
                  className="rounded border-zinc-700 bg-zinc-950 text-sky-500"
                  checked={autoDesc}
                  disabled={!repoPath}
                  onChange={(e) => {
                    const on = e.target.checked
                    setAutoDesc(on)
                    if (on) void generateDescription(targetBranch, sourceBranch)
                    else setGenNote('')
                  }}
                  data-testid="create-pr-auto-desc"
                />
                <span>{t('pr.autoDesc')}</span>
              </label>
              {autoDesc && (
                <button
                  type="button"
                  className="text-sky-400 hover:underline disabled:opacity-50"
                  disabled={generating}
                  onClick={() => void generateDescription(targetBranch, sourceBranch)}
                >
                  {generating ? t('common.loading') : t('pr.regenerate')}
                </button>
              )}
            </span>
          </div>
          <textarea
            className={`${inputClass} min-h-24 resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('pr.commentPlaceholder')}
            data-testid="create-pr-desc"
          />
          {autoDesc && (
            <span className="text-[10px] text-zinc-500">
              {genNote || tf('pr.autoDescHint', { base: targetBranch, head: sourceBranch })}
            </span>
          )}
        </div>

        <label className="flex items-center gap-2 text-zinc-300">
          <input
            type="checkbox"
            className="rounded border-zinc-700 bg-zinc-950 text-sky-500"
            checked={draft}
            onChange={(e) => setDraft(e.target.checked)}
          />
          <span>{t('pr.draft')}</span>
        </label>
      </form>
    </Modal>
  )
}
