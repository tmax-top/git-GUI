import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleExclamation, faCopy, faCheck } from '@fortawesome/free-solid-svg-icons'
import { Modal, btnGhost, btnPrimary } from './Modal'
import { useApp } from '../store'
import { t } from '../i18n'

export function ErrorModal(): React.JSX.Element | null {
  const error = useApp((s) => s.error)
  const errorDetailOpen = useApp((s) => s.errorDetailOpen)
  const closeErrorDetail = useApp((s) => s.closeErrorDetail)
  const [copied, setCopied] = useState(false)

  if (!errorDetailOpen || !error) return null

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(error)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  return (
    <Modal
      title={t('error.modalTitle')}
      onClose={closeErrorDetail}
      footer={
        <>
          <button className={btnGhost()} onClick={() => void handleCopy()}>
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="mr-1.5 h-3.5 w-3.5" />
            <span>{copied ? t('common.copied') : t('common.copy')}</span>
          </button>
          <button className={btnPrimary()} onClick={closeErrorDetail}>
            {t('common.close')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-rose-400">
          <FontAwesomeIcon icon={faCircleExclamation} className="h-4 w-4 shrink-0" />
          <span className="text-xs font-medium">{t('error.modalDesc')}</span>
        </div>
        <pre className="max-h-96 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-rose-300 whitespace-pre-wrap break-all select-text">
          {error}
        </pre>
      </div>
    </Modal>
  )
}
