import { useCallback, useEffect, useState } from 'react'
import { useApp } from '../store'
import { t, tf } from '../i18n'
import { Modal, btnGhost, btnPrimary, inputClass } from '../components/Modal'
import { basename } from '../utils/format'
import type { ProgressEventDto } from '@shared/ipc'
import { parseRepoRef, type ProviderAccountDto, type RemoteRepoDto } from '@shared/providers'

function defaultNameFromUrl(url: string): string {
  const ref = parseRepoRef(url)
  if (ref) return ref.repo
  const cleaned = url.replace(/\.git\/?$/, '').replace(/\/+$/, '')
  const last = cleaned.split('/').pop() ?? 'repo'
  return last.replace(/[^a-zA-Z0-9._-]/g, '-') || 'repo'
}

export function CloneDialog(props: { onClose: () => void }): React.JSX.Element {
  const openRepo = useApp((s) => s.openRepo)
  const [url, setUrl] = useState('')
  const [dir, setDir] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [depth, setDepth] = useState('')
  const [cloning, setCloning] = useState(false)
  const [opId, setOpId] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProgressEventDto | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Remote accounts & repository browsing
  const [accounts, setAccounts] = useState<ProviderAccountDto[]>([])
  const [activeTab, setActiveTab] = useState<'url' | string>('url')
  const [remoteRepos, setRemoteRepos] = useState<Record<string, RemoteRepoDto[]>>({})
  const [loadingRepos, setLoadingRepos] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')

  const loadRepos = useCallback(
    (acc: ProviderAccountDto): void => {
      if (remoteRepos[acc.provider]) return
      setLoadingRepos((prev) => ({ ...prev, [acc.provider]: true }))
      void window.api
        .providerListRepos({ provider: acc.provider, org: acc.org })
        .then((list) => {
          setRemoteRepos((prev) => ({ ...prev, [acc.provider]: list }))
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : String(err))
        })
        .finally(() => {
          setLoadingRepos((prev) => ({ ...prev, [acc.provider]: false }))
        })
    },
    [remoteRepos]
  )

  useEffect(() => {
    void window.api.providerListAccounts().then((accs) => {
      setAccounts(accs)
      if (accs.length > 0) {
        const ado = accs.find((a) => a.provider === 'azuredevops')
        const chosen = ado ?? accs[0]
        if (chosen) {
          setActiveTab(chosen.provider)
          loadRepos(chosen)
        }
      }
    })
  }, [loadRepos])

  const repoRef = parseRepoRef(url)

  useEffect(() => {
    if (!cloning) return
    return window.api.onGitProgress(({ event }) => setProgress(event))
  }, [cloning])

  const pickDir = async (): Promise<void> => {
    const d = await window.api.pickDirectory()
    if (d) setDir(d)
  }

  const targetDir = dir && (name.trim() || defaultNameFromUrl(url)) ? `${dir}/${name.trim() || defaultNameFromUrl(url)}` : ''

  const startClone = async (): Promise<void> => {
    if (!url.trim() || !dir) return
    setCloning(true)
    setError(null)
    const id = crypto.randomUUID()
    setOpId(id)
    try {
      await window.api.gitClone({
        url: url.trim(),
        targetDir,
        depth: depth.trim() ? Number(depth.trim()) : undefined,
        opId: id
      })
      await openRepo(targetDir)
      props.onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg === 'operation cancelled' ? t('sync.cancelled') : msg)
    } finally {
      setCloning(false)
      setOpId(null)
      setProgress(null)
    }
  }

  const currentRepos = (activeTab !== 'url' ? remoteRepos[activeTab] : null) ?? []
  const filteredRepos = currentRepos.filter((r) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return r.name.toLowerCase().includes(q) || r.fullName.toLowerCase().includes(q)
  })

  return (
    <Modal
      title={t('clone.title')}
      onClose={cloning ? () => {} : props.onClose}
      footer={
        cloning ? (
          <button
            className={btnGhost()}
            disabled={!opId}
            onClick={() => opId && void window.api.gitCancel(opId)}
          >
            {t('common.cancel')}
          </button>
        ) : (
          <>
            <button className={btnGhost()} onClick={props.onClose}>
              {t('common.cancel')}
            </button>
            <button
              className={btnPrimary()}
              disabled={!url.trim() || !dir}
              onClick={() => void startClone()}
            >
              {cloning ? t('clone.cloning') : t('clone.submit')}
            </button>
          </>
        )
      }
    >
      <div className="space-y-3 text-sm">
        {accounts.length > 0 && (
          <div className="flex border-b border-zinc-800 pb-2 gap-2 text-xs font-medium">
            {accounts.map((a) => (
              <button
                key={a.provider}
                type="button"
                className={`rounded px-2.5 py-1 transition ${
                  activeTab === a.provider
                    ? 'bg-zinc-800 text-emerald-400 font-semibold shadow'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
                onClick={() => {
                  setActiveTab(a.provider)
                  setError(null)
                  loadRepos(a)
                }}
              >
                {a.provider === 'azuredevops' ? t('clone.tabAdo') : t('clone.tabGh')}
              </button>
            ))}
            <button
              type="button"
              className={`rounded px-2.5 py-1 transition ${
                activeTab === 'url'
                  ? 'bg-zinc-800 text-emerald-400 font-semibold shadow'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
              onClick={() => {
                setActiveTab('url')
                setError(null)
              }}
            >
              {t('clone.tabUrl')}
            </button>
          </div>
        )}

        {activeTab !== 'url' && (
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <input
                className={`${inputClass()} flex-1`}
                placeholder={t('clone.searchRepos')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={cloning}
              />
              <button
                type="button"
                className={btnGhost() + ' px-2.5 py-1.5 text-xs shrink-0'}
                onClick={() => {
                  const acc = accounts.find((a) => a.provider === activeTab)
                  if (acc) {
                    setRemoteRepos((prev) => {
                      const next = { ...prev }
                      delete next[activeTab]
                      return next
                    })
                    loadRepos(acc)
                  }
                }}
                disabled={Boolean(loadingRepos[activeTab]) || cloning}
                title={t('toolbar.refresh')}
              >
                ↻
              </button>
            </div>
            {loadingRepos[activeTab] && (
              <div className="py-6 text-center text-xs text-zinc-500">
                {t('clone.loadingRepos')}
              </div>
            )}
            {!loadingRepos[activeTab] && (
              <>
                <div className="flex items-center justify-between px-1 text-[11px] text-zinc-500">
                  <span>{tf('clone.reposFound', { count: String(filteredRepos.length) })}</span>
                </div>
                <div className="max-h-52 overflow-y-auto space-y-1 rounded border border-zinc-800 bg-zinc-950 p-1">
                  {filteredRepos.length === 0 ? (
                    <div className="py-6 text-center text-xs text-zinc-500">
                      {t('clone.emptyRepos')}
                    </div>
                  ) : (
                    filteredRepos.slice(0, 100).map((r) => {
                      const isSelected = url === r.cloneUrl
                      return (
                        <div
                          key={r.id}
                          onClick={() => {
                            setUrl(r.cloneUrl)
                            setName(r.name)
                          }}
                          className={`flex cursor-pointer items-center justify-between rounded px-2.5 py-1.5 text-xs transition ${
                            isSelected
                              ? 'bg-emerald-950/60 border border-emerald-600/50 text-emerald-200'
                              : 'hover:bg-zinc-900 text-zinc-300'
                          }`}
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="font-semibold truncate text-zinc-100">{r.fullName}</span>
                            {r.description && (
                              <span className="text-[11px] text-zinc-500 truncate">{r.description}</span>
                            )}
                          </div>
                          {r.defaultBranch && (
                            <span className="shrink-0 rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] text-zinc-400 font-mono">
                              {r.defaultBranch}
                            </span>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {(activeTab === 'url' || url) && (
          <label className="block">
            <span className="mb-1 block text-zinc-400">{t('clone.url')}</span>
            <input
              className={inputClass()}
              placeholder="https://github.com/user/repo.git"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={cloning}
              data-testid="clone-url-input"
            />
            {repoRef && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-sky-400" data-testid="clone-repo-badge">
                <span className="rounded bg-sky-950 px-1.5 py-0.5 font-medium text-sky-300">
                  {repoRef.provider === 'github' ? 'GitHub' : 'Azure DevOps'}
                </span>
                <span className="font-mono text-zinc-400">{repoRef.canonical}</span>
              </div>
            )}
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-zinc-400">{t('clone.dir')}</span>
          <div className="flex gap-2">
            <input
              className={inputClass()}
              value={dir ?? ''}
              placeholder={t('clone.pickDir')}
              onChange={(e) => setDir(e.target.value || null)}
              disabled={cloning}
            />
            <button className={btnGhost()} onClick={() => void pickDir()} disabled={cloning}>
              …
            </button>
          </div>
          {targetDir && <div className="mt-1 text-xs text-zinc-500">→ {targetDir}</div>}
        </label>
        <label className="block">
          <span className="mb-1 block text-zinc-400">{t('init.name')}</span>
          <input
            className={inputClass()}
            placeholder={defaultNameFromUrl(url) || 'repo'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={cloning}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-zinc-400">{t('clone.depth')}</span>
          <input
            className={inputClass()}
            placeholder="e.g. 1"
            value={depth}
            onChange={(e) => setDepth(e.target.value.replace(/\D/g, ''))}
            disabled={cloning}
          />
        </label>
        {cloning && (
          <div className="text-xs text-zinc-400">
            {t('clone.cloning')}{' '}
            {progress && (
              <span>
                {progress.stage}
                {progress.percent != null ? ` ${progress.percent}%` : ''}
              </span>
            )}
          </div>
        )}
        {error && <div className="text-xs text-rose-400">{error}</div>}
      </div>
    </Modal>
  )
}

export function InitDialog(props: { onClose: () => void }): React.JSX.Element {
  const openRepo = useApp((s) => s.openRepo)
  const settings = useApp((s) => s.settings)
  const [dir, setDir] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [branch, setBranch] = useState(settings.defaultBranch)
  const [error, setError] = useState<string | null>(null)

  const pickDir = async (): Promise<void> => {
    const d = await window.api.pickDirectory()
    if (d) setDir(d)
  }

  const create = async (): Promise<void> => {
    if (!dir || !name.trim()) return
    try {
      const { repoPath } = await window.api.gitInit({
        dir,
        name: name.trim(),
        defaultBranch: branch.trim() || 'main'
      })
      await openRepo(repoPath)
      props.onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Modal
      title={t('init.title')}
      onClose={props.onClose}
      footer={
        <>
          <button className={btnGhost()} onClick={props.onClose}>
            {t('common.cancel')}
          </button>
          <button
            className={btnPrimary()}
            disabled={!dir || !name.trim()}
            onClick={() => void create()}
          >
            {t('init.submit')}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="mb-1 block text-zinc-400">{t('init.dir')}</span>
          <div className="flex gap-2">
            <input
              className={inputClass()}
              value={dir ?? ''}
              placeholder={t('clone.pickDir')}
              onChange={(e) => setDir(e.target.value || null)}
            />
            <button className={btnGhost()} onClick={() => void pickDir()}>
              …
            </button>
          </div>
          {dir && name.trim() && (
            <div className="mt-1 text-xs text-zinc-500">
              → {dir}/{name.trim()} ({basename(dir)})
            </div>
          )}
        </label>
        <label className="block">
          <span className="mb-1 block text-zinc-400">{t('init.name')}</span>
          <input
            className={inputClass()}
            placeholder="my-project"
            value={name}
            onChange={(e) => setName(e.target.value.replace(/[/\\]/g, ''))}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-zinc-400">{t('init.branch')}</span>
          <input className={inputClass()} value={branch} onChange={(e) => setBranch(e.target.value)} />
        </label>
        {error && <div className="text-xs text-rose-400">{error}</div>}
      </div>
    </Modal>
  )
}
