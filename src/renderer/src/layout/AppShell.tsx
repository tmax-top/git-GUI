import { useApp } from '../store'
import { t } from '../i18n'
import { Toolbar } from './Toolbar'
import { LeftPanel } from './LeftPanel'
import { StatusBar } from './StatusBar'
import { CommitGraph } from '../graph/CommitGraph'
import { CommitPanel } from '../panel/CommitPanel'
import { DiffPanel } from '../panel/DiffPanel'
import { Modal, btnDanger, btnGhost, btnPrimary } from '../components/Modal'
import { useState } from 'react'

function ConfirmModal(): React.JSX.Element | null {
  const confirm = useApp((s) => s.confirm)
  const setConfirm = useApp((s) => s.setConfirm)
  const [busy, setBusy] = useState(false)
  if (!confirm) return null
  return (
    <Modal
      title={confirm.title}
      onClose={() => setConfirm(null)}
      footer={
        <>
          <button className={btnGhost()} onClick={() => setConfirm(null)} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button
            className={confirm.danger ? btnDanger() : btnPrimary()}
            disabled={busy}
            onClick={() => {
              setBusy(true)
              void Promise.resolve(confirm.onConfirm()).finally(() => {
                setBusy(false)
                setConfirm(null)
              })
            }}
          >
            {confirm.confirmLabel ?? t('common.confirm')}
          </button>
        </>
      }
    >
      <div className="text-sm text-zinc-300">{confirm.body}</div>
    </Modal>
  )
}

function PushConflictModal(): React.JSX.Element | null {
  const pushConflict = useApp((s) => s.pushConflict)
  const setPushConflict = useApp((s) => s.setPushConflict)
  const pull = useApp((s) => s.pull)
  const push = useApp((s) => s.push)
  if (!pushConflict) return null
  const close = (): void => setPushConflict(false)
  return (
    <Modal title={t('sync.rejected')} onClose={close}>
      <div className="flex flex-col gap-2">
        <button
          className={btnPrimary()}
          onClick={() => {
            close()
            void pull(false)
          }}
        >
          {t('sync.pullMerge')}
        </button>
        <button
          className={btnGhost()}
          onClick={() => {
            close()
            void pull(true)
          }}
        >
          {t('sync.pullRebase')}
        </button>
        <button
          className={btnDanger()}
          onClick={() => {
            close()
            void push(true)
          }}
        >
          {t('sync.forcePush')}
        </button>
        <button className={btnGhost()} onClick={close}>
          {t('common.cancel')}
        </button>
      </div>
    </Modal>
  )
}

export function AppShell(): React.JSX.Element {
  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <LeftPanel />
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 basis-[55%] flex-col">
            <CommitGraph />
          </div>
          <div className="flex min-h-0 flex-1 flex-col border-t border-zinc-800 bg-zinc-950">
            <DiffPanel />
          </div>
        </main>
        <CommitPanel />
      </div>
      <StatusBar />
      <ConfirmModal />
      <PushConflictModal />
    </div>
  )
}
