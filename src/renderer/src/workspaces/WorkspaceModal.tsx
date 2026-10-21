import { useState } from 'react'
import { Modal, btnDanger, btnGhost, btnPrimary, inputClass } from '../components/Modal'
import { t, tf } from '../i18n'
import { useApp } from '../store'
import type { WorkspaceDto } from '@shared/ipc'
import { basename } from '../utils/format'

export function WorkspaceModal(): React.JSX.Element | null {
  const open = useApp((s) => s.workspaceModalOpen)
  const close = useApp((s) => s.closeWorkspaceModal)
  const workspaces = useApp((s) => s.settings.workspaces ?? [])
  const activeId = useApp((s) => s.settings.activeWorkspaceId)
  const createWorkspace = useApp((s) => s.createWorkspace)
  const updateWorkspace = useApp((s) => s.updateWorkspace)
  const deleteWorkspace = useApp((s) => s.deleteWorkspace)
  const setActiveWorkspace = useApp((s) => s.setActiveWorkspace)
  const openRepo = useApp((s) => s.openRepo)

  const [selectedId, setSelectedId] = useState<string | null>(activeId || workspaces[0]?.id || null)
  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [repos, setRepos] = useState<string[]>([])
  const [newRepoPath, setNewRepoPath] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const selectedWorkspace = workspaces.find((w) => w.id === selectedId)

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
      setError('工作区名称不能为空')
      return
    }
    setError(null)
    if (isCreating) {
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
      if (selectedId && !isCreating) {
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
    if (selectedId && !isCreating) {
      await updateWorkspace(selectedId, { repoPaths: updated })
    }
  }

  const handleOpenRepo = async (path: string): Promise<void> => {
    close()
    await openRepo(path)
  }

  return (
    <Modal title={t('workspace.title')} onClose={close}>
      <div className="flex h-[60vh] gap-4 text-xs" data-testid="workspace-modal">
        {/* Left pane: Workspace list */}
        <div className="flex w-56 shrink-0 flex-col border-r border-zinc-800 pr-3">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 font-semibold text-zinc-300">
            <span>{t('workspace.title')}</span>
            <button
              className={btnPrimary() + ' px-2 py-0.5 text-[11px]'}
              onClick={startCreate}
              data-testid="workspace-new-btn"
            >
              ＋ {t('workspace.new')}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1" data-testid="workspace-list">
            {workspaces.map((w) => (
              <button
                key={w.id}
                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left transition ${
                  selectedId === w.id && !isCreating
                    ? 'bg-zinc-800 text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
                onClick={() => selectExisting(w)}
                data-testid={`workspace-item-${w.id}`}
              >
                <div className="truncate flex items-center gap-1.5">
                  {activeId === w.id && <span className="text-emerald-400 font-bold">●</span>}
                  <span className="truncate">{w.name}</span>
                </div>
                <span className="rounded bg-zinc-800 px-1 py-0.2 text-[10px] text-zinc-400">
                  {w.repoPaths.length}
                </span>
              </button>
            ))}

            {workspaces.length === 0 && (
              <div className="py-6 text-center text-zinc-600">{t('workspace.empty')}</div>
            )}
          </div>
        </div>

        {/* Right pane: Editor / details */}
        <div className="flex flex-1 flex-col overflow-y-auto pl-1">
          {isCreating || selectedWorkspace ? (
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">
                  {isCreating ? t('workspace.new') : selectedWorkspace?.name}
                </span>
                {!isCreating && selectedWorkspace && (
                  <div className="flex items-center gap-2">
                    <button
                      className={btnGhost() + ' text-[11px]'}
                      onClick={() => void setActiveWorkspace(activeId === selectedWorkspace.id ? null : selectedWorkspace.id)}
                      data-testid="workspace-set-active-btn"
                    >
                      {activeId === selectedWorkspace.id ? '取消激活' : '设为当前工作区'}
                    </button>
                    <button
                      className={btnDanger() + ' px-2 py-1 text-[11px]'}
                      onClick={() => void handleDelete(selectedWorkspace)}
                      data-testid="workspace-delete-btn"
                    >
                      删除
                    </button>
                  </div>
                )}
              </div>

              <label className="flex flex-col gap-1 text-zinc-400">
                <span>{t('workspace.name')}</span>
                <input
                  className={inputClass()}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                  placeholder={t('workspace.descPlaceholder')}
                  data-testid="workspace-desc-input"
                />
              </label>

              {/* Repositories section */}
              <div className="flex flex-1 flex-col gap-1.5 mt-2">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>{t('workspace.repos')} ({repos.length})</span>
                </div>

                <div className="flex gap-2">
                  <input
                    className={`${inputClass()} flex-1`}
                    value={newRepoPath}
                    onChange={(e) => setNewRepoPath(e.target.value)}
                    placeholder="/path/to/repo"
                    data-testid="workspace-repo-path-input"
                  />
                  <button
                    className={btnGhost() + ' px-2.5'}
                    onClick={() => void handlePickDir()}
                    title={t('start.open')}
                  >
                    …
                  </button>
                  <button
                    className={btnPrimary() + ' text-[11px] px-2.5'}
                    disabled={!newRepoPath.trim()}
                    onClick={() => void addPath(newRepoPath)}
                    data-testid="workspace-add-repo-btn"
                  >
                    {t('workspace.addRepo')}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto rounded border border-zinc-800 bg-zinc-950 p-2 space-y-1">
                  {repos.map((p) => (
                    <div
                      key={p}
                      className="flex items-center justify-between gap-2 rounded bg-zinc-900/80 px-2 py-1.5 text-zinc-300"
                      data-testid="workspace-repo-item"
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="font-semibold text-zinc-200 truncate">{basename(p)}</span>
                        <span className="font-mono text-[10px] text-zinc-500 truncate">{p}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          className={btnPrimary() + ' px-2 py-0.5 text-[10px]'}
                          onClick={() => void handleOpenRepo(p)}
                        >
                          打开
                        </button>
                        <button
                          className="rounded px-1.5 py-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                          onClick={() => void handleRemoveRepo(p)}
                          title={t('workspace.removeRepo')}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}

                  {repos.length === 0 && (
                    <div className="py-6 text-center text-zinc-600">{t('workspace.noRepos')}</div>
                  )}
                </div>
              </div>

              {error && <div className="text-rose-400 text-xs">{error}</div>}

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  className={btnPrimary()}
                  onClick={() => void handleSave()}
                  data-testid="workspace-save-btn"
                >
                  {isCreating ? t('common.confirm') : '保存变更'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-zinc-600">
              请选择或创建一个工作区
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
