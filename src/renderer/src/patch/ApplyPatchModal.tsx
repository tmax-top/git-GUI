import { useState } from 'react'
import { Modal, btnGhost, btnPrimary, inputClass } from '../components/Modal'
import { t } from '../i18n'
import { useApp } from '../store'

export function ApplyPatchModal(): React.JSX.Element | null {
  const open = useApp((s) => s.patchModalOpen)
  const close = useApp((s) => s.closePatchModal)
  const applyPatch = useApp((s) => s.applyPatch)

  const [filePath, setFilePath] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!open) return null

  const handlePickFile = async (): Promise<void> => {
    const file = await window.api.pickFile({
      title: t('patch.pickFile'),
      filters: [{ name: 'Patch files', extensions: ['patch', 'diff'] }]
    })
    if (file) {
      setFilePath(file)
      setError(null)
    }
  }

  const handleApply = async (): Promise<void> => {
    if (!filePath.trim() && !content.trim()) {
      setError(t('patch.contentRequired'))
      return
    }
    setBusy(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await applyPatch({
        patchPath: filePath.trim() || undefined,
        patchContent: content.trim() || undefined
      })
      setSuccessMsg(res.message)
      setTimeout(() => {
        close()
      }, 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('error.generic'))
    } finally {
      setBusy(false)
    }
  }

  const footer = (
    <>
      <button className={btnGhost()} onClick={close} disabled={busy}>
        {t('common.cancel')}
      </button>
      <button
        className={btnPrimary()}
        disabled={busy || (!filePath.trim() && !content.trim())}
        onClick={() => void handleApply()}
        data-testid="apply-patch-submit"
      >
        {busy ? '…' : t('patch.apply')}
      </button>
    </>
  )

  return (
    <Modal title={t('patch.applyModalTitle')} onClose={close} footer={footer}>
      <div className="flex flex-col gap-3 text-xs" data-testid="apply-patch-modal">
        {/* Choose file section */}
        <div className="flex flex-col gap-1.5">
          <span className="font-medium text-zinc-300">{t('patch.pickFile')}</span>
          <div className="flex gap-2">
            <input
              className={`${inputClass()} flex-1`}
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="/path/to/my-change.patch"
              data-testid="apply-patch-path-input"
            />
            <button
              className={btnGhost()}
              onClick={() => void handlePickFile()}
              data-testid="apply-patch-pick-btn"
            >
              …
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-zinc-500">
          <div className="flex-1 h-px bg-zinc-800" />
          <span>{t('common.or')}</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Paste text section */}
        <div className="flex flex-col gap-1.5">
          <span className="font-medium text-zinc-300">{t('patch.pasteText')}</span>
          <textarea
            className={`${inputClass()} min-h-36 font-mono text-[11px] resize-y`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="diff --git a/... b/..."
            data-testid="apply-patch-content-input"
          />
        </div>

        {error && <div className="text-rose-400 text-xs">{error}</div>}
        {successMsg && <div className="text-emerald-400 text-xs">{successMsg}</div>}
      </div>
    </Modal>
  )
}
