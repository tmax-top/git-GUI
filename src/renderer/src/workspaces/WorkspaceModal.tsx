import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faXmark, faFolderOpen } from '@fortawesome/free-solid-svg-icons'
import { Modal, btnDanger, btnGhost, btnPrimary, inputClass } from '../components/Modal'
import { t, tf } from '../i18n'
import { useApp } from '../store'
import type { WorkspaceDto } from '@shared/ipc'
import { basename } from '../utils/format'

export function WorkspaceModal(): React.JSX.Element | null {
  const open = useApp((s) => s.workspaceModalOpen)
  // Mounted only while open so the editor state re-initializes from the
  // current workspaces on every open (instead of once at app boot).
  if (!open) return null
  return <WorkspaceEditor />
}

function WorkspaceEditor(): React.JSX.Element {
  const close = useApp((s) => s.closeWorkspaceModal)
  const workspaces = useApp((s) => s.settings.workspaces ?? [])
  const activeId = useApp((s) => s.settings.activeWorkspaceId)
  const createWorkspace = useApp((s) => s.createWorkspace)
  const updateWorkspace = useApp((s) => s.updateWorkspace)
  const deleteWorkspace = useApp((s) => s.deleteWorkspace)
  const setActiveWorkspace = useApp((s) => s.setActiveWorkspace)
  const openRepo = useApp((s) => s.openRepo)

  const initial = workspaces.find((w) => w.id === (activeId || workspaces[0]?.id)) ?? null
  const [selectedId, setSelectedId] = useState<string | null>(initial?.id ?? null)
  const [isCreating, setIsCreating] = useState(workspaces.length === 0)
  const [name, setName] = useState(initial?.name ?? '')
  const [desc, setDesc] = useState(initial?.description ?? '')
  const [repos, setRepos] = useState<string[]>(initial ? [...initial.repoPaths] : [])
  const [newRepoPath, setNewRepoPath] = useState('')
  const [error, setError] = useState<string | null>(null)

  const found = workspaces.find((w) => w.id === selectedId)
  // Seed the form from the initially selected workspace (mount-time init).
  const selectedWorkspace = found
  const creating = isCreating || !selectedWorkspace

  const startCreate = (): void => {
    setIsCreating(true)
    setSelectedId(null)
    setName('')
    setDesc('')
    setRepos([])
    setError(null)
  }

  const selectExisting = (w: WorkspaceDto): void => {
    setIsCreating(false)
    setSelectedId(w.id)
    setName(w.name)
    setDesc(w.description ?? '')
    setRepos([...w.repoPaths])
    setError(null)
  }

  const handleSave = async (): Promise<void> => {
    if (!name.trim()) {
      setError(t('workspace.nameRequired'))
      return
    }
    setError(null)
    if (creating) {
      const created = await createWorkspace(name.trim(), desc.trim(), repos)
      setIsCreating(false)
      setSelectedId(created.id)
    } else if (selectedId) {
      await updateWorkspace(selectedId, {
        name: name.trim(),
        description: desc.trim() || undefined,
        repoPaths: repos
      })
    }
  }

  const handleDelete = async (w: WorkspaceDto): Promise<void> => {
    if (!window.confirm(tf('workspace.deleteConfirm', { name: w.name }))) return
    await deleteWorkspace(w.id)
    if (selectedId === w.id) {
      const remaining = workspaces.filter((x) => x.id !== w.id)
      if (remaining.length > 0) selectExisting(remaining[0])
      else startCreate()
    }
  }

  const addPath = async (dir: string): Promise<void> => {
    if (!dir.trim()) return
    const trimmed = dir.trim()
    const valid = await window.api.repoValidate(trimmed)
    if (!valid.isRepo) {
      setError(t('start.notRepo'))
      return
    }
    setError(null)
    if (!repos.includes(trimmed)) {
      const updated = [...repos, trimmed]
      setRepos(updated)
      setNewRepoPath('')
      if (selectedId && !creating) {
        await updateWorkspace(selectedId, { repoPaths: updated })
      }
    }
  }

  const handlePickDir = async (): Promise<void> => {
    const dir = await window.api.pickDirectory()
    if (dir) void addPath(dir)
  }

  const handleRemoveRepo = async (path: string): Promise<void> => {
    const updated = repos.filter((p) => p !== path)
    setRepos(updated)
    if (selectedId && !creating) {
      await updateWorkspace(selectedId, { repoPaths: updated })
    }
  }

  const handleOpenRepo = async (path: string): Promise<void> => {
    close()
    await openRepo(path)
  }

  return (
    <Modal
      title={t('workspace.title')}
      onClose={close}
      maxWidth="max-w-3xl"
      bodyClassName="p-0 overflow-hidden"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <span className="truncate text-xs text-rose-500">{error}</span>
          <div className="flex shrink-0 items-center gap-2">
            <button className={btnGhost() + ' px-3 py-1.5 text-xs'} onClick={close}>
              {t('common.cancel')}
            </button>
            <button
              className={btnPrimary() + ' px-4 py-1.5 text-xs'}
              onClick={() => void handleSave()}
              data-testid="workspace-save-btn"
            >
              {creating ? t('common.confirm') : t('common.saveChanges')}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex max-h-[70vh] text-xs" data-testid="workspace-modal">
        {/* Left pane: workspace list */}
        <div className="flex w-60 shrink-0 flex-col border-r border-zinc-800">
          <div className="p-2.5">
            <button
              className={btnPrimary() + ' flex w-full items-center justify-center gap-1.5 px-2 py-1.5 text-xs'}
              onClick={startCreate}
              data-testid="workspace-new-btn"
            >
              <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
              {t('workspace.new')}
            </button>
          </div>

          <div
            className="flex-1 space-y-1 overflow-y-auto px-2 pb-2"
            data-testid="workspace-list"
          >
            {workspaces.map((w) => (
              <button
                key={w.id}
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition ${
                  !creating && selectedId === w.id
                    ? 'bg-zinc-800 font-medium text-zinc-100'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
                onClick={() => selectExisting(w)}
                data-testid={`workspace-item-${w.id}`}
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    activeId === w.id ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}
                />
                <span className="min-w-0 flex-1 truncate">{w.name}</span>
                <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                  {w.repoPaths.length}
                </span>
              </button>
            ))}

            {workspaces.length === 0 && (
              <div className="px-2 py-8 text-center leading-relaxed text-zinc-500">
                {t('workspace.empty')}
              </div>
            )}
          </div>
        </div>

        {/* Right pane: editor */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-2.5">
            <span className="min-w-0 truncate text-sm font-semibold text-zinc-100">
              {creating ? t('workspace.new') : (selectedWorkspace?.name ?? '')}
            </span>
            {!creating && selectedWorkspace && (
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  className={btnGhost() + ' px-2 py-1 text-[11px]'}
                  onClick={() =>
                    void setActiveWorkspace(activeId === selectedWorkspace.id ? null : selectedWorkspace.id)
                  }
                  data-testid="workspace-set-active-btn"
                >
                  {activeId === selectedWorkspace.id ? t('workspace.clearActive') : t('workspace.setActive')}
                </button>
                <button
                  className={btnDanger() + ' px-2 py-1 text-[11px]'}
                  onClick={() => void handleDelete(selectedWorkspace)}
                  data-testid="workspace-delete-btn"
                >
                  {t('common.delete')}
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-zinc-400">
                <span>{t('workspace.name')}</span>
                <input
                  className={inputClass()}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSave()
                  }}
                  placeholder={t('workspace.namePlaceholder')}
                  data-testid="workspace-name-input"
                />
              </label>

              <label className="flex flex-col gap-1 text-zinc-400">
                <span>{t('workspace.desc')}</span>
                <input
                  className={inputClass()}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSave()
                  }}
                  placeholder={t('workspace.descPlaceholder')}
                  data-testid="workspace-desc-input"
                />
              </label>
            </div>

            {/* Repositories */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-zinc-400">
                <span>{t('workspace.repos')}</span>
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                  {repos.length}
                </span>
              </div>

              <div className="flex gap-1.5">
                <input
                  className={inputClass() + ' flex-1'}
                  value={newRepoPath}
                  onChange={(e) => setNewRepoPath(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void addPath(newRepoPath)
                  }}
                  placeholder="/path/to/repo"
                  data-testid="workspace-repo-path-input"
                />
                <button
                  className={btnGhost() + ' px-2.5 py-1.5 text-xs'}
                  onClick={() => void handlePickDir()}
                  title={t('start.open')}
                >
                  …
                </button>
                <button
                  className={btnPrimary() + ' px-2.5 py-1.5 text-xs'}
                  disabled={!newRepoPath.trim()}
                  onClick={() => void addPath(newRepoPath)}
                  data-testid="workspace-add-repo-btn"
                >
                  {t('workspace.addRepo')}
                </button>
              </div>

              <div className="max-h-[240px] min-h-[72px] space-y-1 overflow-y-auto rounded border border-zinc-800 bg-zinc-950 p-1.5">
                {repos.map((p) => (
                  <div
                    key={p}
                    className="group/repo flex items-center gap-2 rounded bg-zinc-900 px-2.5 py-2 text-zinc-300 hover:bg-zinc-800"
                    data-testid="workspace-repo-item"
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium text-zinc-200">{basename(p)}</span>
                      <span className="truncate font-mono text-[10px] text-zinc-500">{p}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100"
                        onClick={() => void handleOpenRepo(p)}
                      >
                        <FontAwesomeIcon icon={faFolderOpen} className="h-3 w-3" />
                        {t('start.open')}
                      </button>
                      <button
                        className="rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-rose-400"
                        onClick={() => void handleRemoveRepo(p)}
                        title={t('workspace.removeRepo')}
                      >
                        <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {repos.length === 0 && (
                  <div className="py-8 text-center text-zinc-600">{t('workspace.noRepos')}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
