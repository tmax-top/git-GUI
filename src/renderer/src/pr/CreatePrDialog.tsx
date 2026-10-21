import { useState } from 'react'
import { Modal, btnGhost, btnPrimary } from '../components/Modal'
import { t } from '../i18n'
import { useApp } from '../store'

export function CreatePrDialog(): React.JSX.Element {
  const close = useApp((s) => s.closeCreatePr)
  const refs = useApp((s) => s.refs)
  const defaultBranch = useApp((s) => s.settings.defaultBranch) || 'main'
  const createPr = useApp((s) => s.createPr)

  const currentBranch = refs?.current ?? ''
  const localBranches = (refs?.branches ?? []).filter((b) => !b.isRemote).map((b) => b.name)

  const [sourceBranch, setSourceBranch] = useState(currentBranch || (localBranches[0] ?? ''))
  const [targetBranch, setTargetBranch] = useState(
    localBranches.includes(defaultBranch) ? defaultBranch : localBranches[0] ?? 'main'
  )
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [draft, setDraft] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-zinc-400">
            <span>{t('pr.sourceBranch')}</span>
            <input
              className={inputClass}
              value={sourceBranch}
              onChange={(e) => setSourceBranch(e.target.value)}
              placeholder="feature-branch"
              required
              data-testid="create-pr-source"
            />
          </label>
          <label className="flex flex-col gap-1 text-zinc-400">
            <span>{t('pr.targetBranch')}</span>
            <input
              className={inputClass}
              value={targetBranch}
              onChange={(e) => setTargetBranch(e.target.value)}
              placeholder="main"
              required
              data-testid="create-pr-target"
            />
          </label>
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

        <label className="flex flex-col gap-1 text-zinc-400">
          <span>{t('pr.prDesc')}</span>
          <textarea
            className={`${inputClass} min-h-24 resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('pr.commentPlaceholder')}
            data-testid="create-pr-desc"
          />
        </label>

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
