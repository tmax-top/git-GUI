import { useApp } from '../store'
import { t } from '../i18n'
import { Toolbar } from './Toolbar'
import { RepoTabs } from './RepoTabs'
import { LeftPanel } from './LeftPanel'
import { StatusBar } from './StatusBar'
import { OpBanner } from './OpBanner'
import { PromptModal } from './PromptModal'
import { RebaseDialog } from './RebaseDialog'
import { SearchDialog } from './SearchDialog'
import { SettingsDialog } from './SettingsDialog'
import { CommitGraph } from '../graph/CommitGraph'
import { CommitPanel } from '../panel/CommitPanel'
import { DiffPanel } from '../panel/DiffPanel'
import { TerminalPanel } from '../terminal/TerminalPanel'
import { PrPanel } from '../pr/PrPanel'
import { CreatePrDialog } from '../pr/CreatePrDialog'
import { Modal, btnDanger, btnGhost, btnPrimary } from '../components/Modal'
import { ContextMenu } from '../components/ContextMenu'
import { Resizer, useResizableSetting } from '../components/Resizer'
import { useRef, useState } from 'react'

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

function GlobalMenu(): React.JSX.Element | null {
  const menu = useApp((s) => s.menu)
  const closeMenu = useApp((s) => s.closeMenu)
  if (!menu) return null
  return <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={closeMenu} />
}

export function AppShell(): React.JSX.Element {
  const settingsOpen = useApp((s) => s.settingsOpen)
  const createPrOpen = useApp((s) => s.createPrOpen)
  const left = useResizableSetting('leftPanelWidth', 224, 160, 600)
  const right = useResizableSetting('rightPanelWidth', 320, 220, 700)
  const split = useResizableSetting('graphSplitPct', 55, 15, 85)
  const mainRef = useRef<HTMLElement>(null)

  // Convert a vertical drag delta (px) into a split-% delta for the graph area.
  const onSplitDelta = (deltaPx: number): void => {
    const h = mainRef.current?.clientHeight ?? 0
    if (h > 0) split.onDelta((deltaPx / h) * 100)
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <Toolbar />
      <RepoTabs />
      <OpBanner />
      <div className="flex min-h-0 flex-1">
        <LeftPanel width={left.value} />
        <Resizer orientation="vertical" onDelta={left.onDelta} onCommit={left.onCommit} />
        <main ref={mainRef} className="flex min-w-0 flex-1 flex-col">
          <div
            className="flex min-h-0 flex-col"
            style={{ flexBasis: `${split.value}%`, flexGrow: 0, flexShrink: 0 }}
          >
            <CommitGraph />
          </div>
          <Resizer orientation="horizontal" onDelta={onSplitDelta} onCommit={split.onCommit} />
          <div className="flex min-h-0 flex-1 flex-col bg-zinc-950">
            <DiffPanel />
          </div>
        </main>
        <Resizer
          orientation="vertical"
          onDelta={(d) => right.onDelta(-d)}
          onCommit={right.onCommit}
        />
        <CommitPanel width={right.value} />
      </div>
      <TerminalPanel />
      <PrPanel />
      {createPrOpen && <CreatePrDialog />}
      <StatusBar />
      <ConfirmModal />
      <PushConflictModal />
      <PromptModal />
      <RebaseDialog />
      <SearchDialog />
      {settingsOpen && <SettingsDialog />}
      <GlobalMenu />
    </div>
  )
}
