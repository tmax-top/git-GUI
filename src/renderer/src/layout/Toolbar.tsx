import { memo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faRotateLeft,
  faRotateRight,
  faCloudArrowDown,
  faArrowDown,
  faArrowUp,
  faMagnifyingGlass,
  faTerminal,
  faCodePullRequest,
  faFolder,
  faUser,
  faRotate,
  faMoon,
  faSun,
  faKeyboard,
  faCircleQuestion,
  faGear,
  faBoxArchive,
  faXmark
} from '@fortawesome/free-solid-svg-icons'
import { useApp } from '../store'
import { t, tf, type MessageKey } from '../i18n'
import { btnGhost } from '../components/Modal'
import { RepoSwitcher } from './RepoSwitcher'
import { isStaged } from '@shared/status'
import type { UndoDescriptionDto } from '@shared/ipc'

/** Render an undo-stack label (i18n key + params) as tooltip text. */
function describeUndo(d?: UndoDescriptionDto): string {
  if (!d) return ''
  return d.params ? tf(d.key as MessageKey, d.params) : t(d.key as MessageKey)
}

export const Toolbar = memo(function Toolbar(): React.JSX.Element {
  const status = useApp((s) => s.status)
  const sync = useApp((s) => s.sync)
  const fetchNow = useApp((s) => s.fetch)
  const pull = useApp((s) => s.pull)
  const push = useApp((s) => s.push)
  const cancelSync = useApp((s) => s.cancelSync)
  const refreshStatus = useApp((s) => s.refreshStatus)
  const loadGraph = useApp((s) => s.loadGraph)
  const settings = useApp((s) => s.settings)
  const updateSettings = useApp((s) => s.updateSettings)
  const openSearch = useApp((s) => s.openSearch)
  const openSettings = useApp((s) => s.openSettings)
  const openWorkspaceModal = useApp((s) => s.openWorkspaceModal)
  const openCommandPalette = useApp((s) => s.openCommandPalette)
  const openShortcutsModal = useApp((s) => s.openShortcutsModal)
  const terminalOpen = useApp((s) => s.terminalOpen)
  const toggleTerminal = useApp((s) => s.toggleTerminal)
  const prPanelOpen = useApp((s) => s.prPanelOpen)
  const togglePrPanel = useApp((s) => s.togglePrPanel)
  const undoInfo = useApp((s) => s.undoInfo)
  const undo = useApp((s) => s.undo)
  const redo = useApp((s) => s.redo)

  const activeWorkspace = (settings.workspaces ?? []).find(
    (w) => w.id === settings.activeWorkspaceId
  )
  const activeProfile = (settings.profiles ?? []).find(
    (p) => p.id === settings.activeProfileId
  )

  const disabled = sync !== null

  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs">
      <RepoSwitcher variant="logo">
        {(onClick, ref) => (
          <button
            ref={ref}
            className="rounded px-2 py-1 font-semibold text-zinc-300 hover:bg-zinc-800"
            onClick={onClick}
            title={t('repoTabs.switch')}
            data-testid="toolbar-logo"
          >
            Git GUI
          </button>
        )}
      </RepoSwitcher>

      <span
        className="rounded bg-zinc-800 px-2 py-1 font-medium text-emerald-400"
        title={status?.detached ? t('status.detached') : status?.upstream}
      >
        {status?.detached ? `${t('status.detached')} @ ${status.oid?.slice(0, 7) ?? '?'}` : (status?.head ?? '…')}
      </span>

      {status && (status.ahead > 0 || status.behind > 0) && (
        <span className="rounded bg-zinc-800 px-1.5 py-1 text-zinc-400" title={t('toolbar.aheadBehindTip')}>
          ↑{status.ahead} ↓{status.behind}
        </span>
      )}

      <span className="flex-1" />

      <button
        className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40"
        disabled={disabled || !undoInfo.canUndo}
        onClick={() => void undo()}
        title={
          undoInfo.undoLabel
            ? `${t('undo.undo')} — ${describeUndo(undoInfo.undoLabel)}`
            : t('undo.undo')
        }
      >
        <FontAwesomeIcon icon={faRotateLeft} className="h-3.5 w-3.5" />
      </button>
      <button
        className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40"
        disabled={disabled || !undoInfo.canRedo}
        onClick={() => void redo()}
        title={
          undoInfo.redoLabel
            ? `${t('undo.redo')} — ${describeUndo(undoInfo.redoLabel)}`
            : t('undo.redo')
        }
      >
        <FontAwesomeIcon icon={faRotateRight} className="h-3.5 w-3.5" />
      </button>

      <span className="mx-1 h-4 w-px bg-zinc-700" />

      <button
        className={`${btnGhost()} flex items-center gap-1.5 px-2.5 py-1 text-xs`}
        disabled={disabled}
        onClick={() => void fetchNow()}
        title={t('toolbar.fetchTip')}
      >
        <FontAwesomeIcon icon={faCloudArrowDown} className="h-3.5 w-3.5 text-zinc-400" />
        <span>{t('toolbar.fetch')}</span>
      </button>
      <button
        className={`${btnGhost()} flex items-center gap-1.5 px-2.5 py-1 text-xs`}
        disabled={disabled}
        onClick={() => void pull()}
        title={!status?.upstream && !status?.detached ? t('toolbar.noUpstream') : t('toolbar.pullTip')}
      >
        <FontAwesomeIcon icon={faArrowDown} className="h-3.5 w-3.5 text-zinc-400" />
        <span>{t('toolbar.pull')}</span>
      </button>
      <button
        className="flex items-center gap-1.5 rounded border border-emerald-700 bg-emerald-950/30 px-3 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-900/40 disabled:opacity-50"
        disabled={disabled}
        onClick={() => void push()}
        title={t('toolbar.pushTip')}
      >
        <FontAwesomeIcon icon={faArrowUp} className="h-3.5 w-3.5 text-emerald-400" />
        <span>{t('toolbar.push')}</span>
      </button>

      <button
        className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
        onClick={openSearch}
        title={t('toolbar.searchTip')}
      >
        <FontAwesomeIcon icon={faMagnifyingGlass} className="h-3.5 w-3.5" />
      </button>

      <button
        className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition ${terminalOpen ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
        onClick={toggleTerminal}
        title={t('terminal.toggle')}
        data-testid="toolbar-terminal"
      >
        <FontAwesomeIcon icon={faTerminal} className="h-3.5 w-3.5" />
      </button>

      <button
        className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold transition ${prPanelOpen ? 'bg-zinc-700 text-zinc-100 shadow' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
        onClick={togglePrPanel}
        title={t('pr.toggle')}
        data-testid="toolbar-pr"
      >
        <FontAwesomeIcon icon={faCodePullRequest} className="h-3.5 w-3.5 text-sky-400" />
        <span>PR</span>
      </button>

      <button
        className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs transition ${activeWorkspace ? 'bg-zinc-800 text-sky-400 font-medium' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
        onClick={openWorkspaceModal}
        title={activeWorkspace ? `${t('workspace.active')}: ${activeWorkspace.name}` : t('workspace.manage')}
        data-testid="toolbar-workspace-btn"
      >
        <FontAwesomeIcon icon={faFolder} className="h-3.5 w-3.5" />
        {activeWorkspace && <span className="max-w-[100px] truncate">{activeWorkspace.name}</span>}
      </button>

      {activeProfile && (
        <span
          className="flex items-center gap-1.5 rounded bg-zinc-800 px-2 py-0.5 text-xs text-emerald-400 font-mono"
          title={`${t('profile.active')}: ${activeProfile.name} (${activeProfile.authorName} <${activeProfile.authorEmail}>)`}
          data-testid="toolbar-profile"
        >
          <FontAwesomeIcon icon={faUser} className="h-3 w-3" />
          <span className="max-w-[100px] truncate">{activeProfile.name}</span>
        </span>
      )}

      <button
        className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
        onClick={() => {
          void refreshStatus()
          void loadGraph(true)
        }}
        title={t('toolbar.refreshTip')}
      >
        <FontAwesomeIcon icon={faRotate} className="h-3.5 w-3.5" />
      </button>

      <span className="mx-1 h-4 w-px bg-zinc-700" />

      <button
        className={`rounded px-2 py-1 text-xs font-medium transition ${settings.language === 'zh' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
        onClick={() => void updateSettings({ language: 'zh' })}
        title={t('toolbar.langZhTip')}
      >
        中
      </button>
      <button
        className={`rounded px-2 py-1 text-xs font-medium transition ${settings.language === 'en' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
        onClick={() => void updateSettings({ language: 'en' })}
        title={t('toolbar.langEnTip')}
      >
        EN
      </button>
      <button
        className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
        onClick={() => void updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
        title={t('toolbar.themeTip')}
        data-testid="toolbar-theme-toggle"
      >
        <FontAwesomeIcon
          icon={settings.theme === 'dark' ? faMoon : faSun}
          className={`h-3.5 w-3.5 ${settings.theme === 'dark' ? 'text-amber-300' : 'text-amber-500'}`}
        />
      </button>
      <button
        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 font-mono transition"
        onClick={openCommandPalette}
        title={`${t('palette.title')} (⌘K)`}
        data-testid="toolbar-palette"
      >
        <FontAwesomeIcon icon={faKeyboard} className="h-3.5 w-3.5 text-zinc-400" />
        <span>⌘K</span>
      </button>

      <button
        className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
        onClick={openShortcutsModal}
        title={`${t('shortcuts.title')} (⌘/)`}
        data-testid="toolbar-shortcuts"
      >
        <FontAwesomeIcon icon={faCircleQuestion} className="h-3.5 w-3.5" />
      </button>

      <button
        className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
        onClick={() => openSettings()}
        title={t('toolbar.settingsTip')}
        data-testid="toolbar-settings"
      >
        <FontAwesomeIcon icon={faGear} className="h-3.5 w-3.5" />
      </button>

      {sync && (
        <span className="flex items-center gap-2 rounded bg-zinc-800 px-2 py-1 text-zinc-300">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          {t('toolbar.syncing')}
          {sync.progress && (
            <span className="text-zinc-500">
              {sync.progress.stage}
              {sync.progress.percent != null ? ` ${sync.progress.percent}%` : ''}
            </span>
          )}
          <button
            className="rounded p-0.5 text-rose-400 hover:bg-zinc-700"
            onClick={() => void cancelSync()}
            title={t('toolbar.cancelOp')}
          >
            <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
          </button>
        </span>
      )}

      {!sync && status && (
        <span className="flex items-center gap-1.5 text-zinc-500 text-xs" title={t('toolbar.stagedTip')}>
          <FontAwesomeIcon icon={faBoxArchive} className="h-3 w-3 text-zinc-500" />
          <span>
            {tf('status.staged', {
              n: status.files.filter(isStaged).length
            })}
          </span>
        </span>
      )}
    </header>
  )
})
