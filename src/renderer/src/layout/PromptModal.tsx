import { memo, useEffect, useState } from 'react'
import { useApp } from '../store'
import { t } from '../i18n'
import { Modal, btnDanger, btnGhost, btnPrimary, inputClass } from '../components/Modal'

/** Single-field prompt dialog driven by store `prompt` state (tag/branch/stash input). */
export const PromptModal = memo(function PromptModal(): React.JSX.Element | null {
  const prompt = useApp((s) => s.prompt)
  const setPrompt = useApp((s) => s.setPrompt)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (prompt) setValue(prompt.defaultValue ?? '')
  }, [prompt])

  if (!prompt) return null

  const close = (): void => setPrompt(null)

  const submit = (): void => {
    if (busy) return
    setBusy(true)
    void Promise.resolve(prompt.onSubmit(value)).finally(() => {
      setBusy(false)
      setPrompt(null)
    })
  }

  return (
    <Modal
      title={prompt.title}
      onClose={close}
      footer={
        <>
          <button className={btnGhost()} onClick={close} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button
            className={prompt.danger ? btnDanger() : btnPrimary()}
            disabled={busy || !value.trim()}
            onClick={submit}
          >
            {prompt.confirmLabel ?? t('common.confirm')}
          </button>
        </>
      }
    >
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        {prompt.label && <label className="text-xs text-zinc-400">{prompt.label}</label>}
        <input
          className={inputClass()}
          value={value}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
        />
      </form>
    </Modal>
  )
})
