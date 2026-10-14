import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { t } from '../i18n'
import { Modal, btnGhost, btnPrimary, inputClass } from '../components/Modal'
import { basename } from '../utils/format'
import type { ProgressEventDto } from '@shared/ipc'

function defaultNameFromUrl(url: string): string {
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
        <label className="block">
          <span className="mb-1 block text-zinc-400">{t('clone.url')}</span>
          <input
            className={inputClass()}
            placeholder="https://github.com/user/repo.git"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={cloning}
          />
        </label>
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
