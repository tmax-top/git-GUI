import { useEffect, useState } from 'react'
import type {
  ActivityEntryDto,
  GitflowStatusDto,
  HookDto,
  LfsStatusDto,
  RepoSettingsDto,
  SigningStatusDto
} from '@shared/ipc'
import { useApp } from '../store'
import { t, tf, type MessageKey } from '../i18n'
import { Modal, btnGhost, btnPrimary, inputClass } from '../components/Modal'

const INTERVALS = [0, 1, 5, 10, 15, 30, 60] as const

const KIND_KEY: Record<ActivityEntryDto['kind'], MessageKey> = {
  'auto-fetch': 'activity.kind.autoFetch',
  fetch: 'activity.kind.fetch',
  pull: 'activity.kind.pull',
  push: 'activity.kind.push'
}

function timeOf(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function ActivityLog(): React.JSX.Element {
  const repoPath = useApp((s) => s.repoPath)
  const [entries, setEntries] = useState<ActivityEntryDto[]>([])

  useEffect(() => {
    let alive = true
    void window.api.activityList(100).then((list) => {
      if (alive) setEntries(list)
    })
    const unsub = window.api.onActivity((entry) => {
      setEntries((prev) => [entry, ...prev].slice(0, 100))
    })
    return () => {
      alive = false
      unsub()
    }
  }, [])

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {t('activity.title')}
      </div>
      {entries.length === 0 && <div className="text-sm text-zinc-500">{t('activity.empty')}</div>}
      <div className="flex max-h-64 flex-col gap-1 overflow-auto">
        {entries.map((e) => (
          <div
            key={e.id}
            className="flex items-baseline gap-2 rounded bg-zinc-950 px-2 py-1 font-mono text-xs"
            title={e.message ?? e.repoPath}
          >
            <span className="text-zinc-600">{timeOf(e.ts)}</span>
            <span className={e.ok ? 'text-zinc-400' : 'text-rose-400'}>
              {t(KIND_KEY[e.kind])}
            </span>
            {repoPath && e.repoPath !== repoPath && (
              <span className="min-w-0 flex-1 truncate text-zinc-600">
                {e.repoPath.split('/').pop()}
              </span>
            )}
            {repoPath && e.repoPath === repoPath && <span className="flex-1" />}
            {!e.ok && <span className="shrink-0 text-rose-400">{t('activity.failed')}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SettingsDialog(): React.JSX.Element {
  const close = useApp((s) => s.closeSettings)
  const settings = useApp((s) => s.settings)
  const updateSettings = useApp((s) => s.updateSettings)
  const [interval, setIntervalValue] = useState(settings.autoFetchInterval)
  const [prune, setPrune] = useState(settings.autoPrune)
  const [notifications, setNotifications] = useState(settings.notifications)
  const [saving, setSaving] = useState(false)

  // NOTE: mounted by AppShell only while open, so the initial useState read
  // is the fresh store snapshot — no sync-from-store effect needed.

  const save = async (): Promise<void> => {
    setSaving(true)
    try {
      await updateSettings({
        autoFetchInterval: interval,
        autoPrune: prune,
        notifications
      })
      close()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={t('settings.title')}
      onClose={close}
      footer={
        <button className={btnPrimary()} disabled={saving} onClick={() => void save()}>
          {t('common.confirm')}
        </button>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="text-sm font-semibold text-zinc-200">{t('settings.autoFetch')}</div>
          <div className="text-xs text-zinc-500">{t('settings.autoFetchHint')}</div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <span>{t('settings.autoFetchInterval')}</span>
            <select
              className={`${inputClass()} w-32`}
              value={interval}
              onChange={(e) => setIntervalValue(Number(e.target.value))}
            >
              {INTERVALS.map((m) => (
                <option key={m} value={m}>
                  {m === 0
                    ? t('settings.autoFetchOff')
                    : tf('settings.autoFetchMinutes', { n: m })}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={prune}
              onChange={(e) => setPrune(e.target.checked)}
            />
            <span>{t('settings.autoPrune')}</span>
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-sm font-semibold text-zinc-200">{t('settings.notifications')}</div>
          <div className="text-xs text-zinc-500">{t('settings.notificationsHint')}</div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
            />
            <span>{t('settings.notifications')}</span>
          </label>
        </div>

        <ActivityLog />
        <HooksSection />
        <LfsSection />
        <GitflowSection />
        <SigningSection />
        <ExternalToolsSection />
        <RepoSettingsSection />
      </div>
    </Modal>
  )
}

const ENCODINGS = ['utf-8', 'gbk', 'gb18030', 'big5', 'shift_jis', 'euc-kr']

function RepoSettingsSection(): React.JSX.Element {
  const repoPath = useApp((s) => s.repoPath)
  const [settings, setSettings] = useState<RepoSettingsDto | null>(null)
  const [encoding, setEncoding] = useState('utf-8')
  const [defaultBranch, setDefaultBranch] = useState('main')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!repoPath) return
    let alive = true
    void window.api.repoSettingsGet(repoPath).then((s) => {
      if (!alive) return
      setSettings(s)
      setEncoding(s.encoding)
      setDefaultBranch(s.defaultBranch)
    })
    return () => {
      alive = false
    }
  }, [repoPath])

  const save = async (): Promise<void> => {
    if (!repoPath || saving) return
    setSaving(true)
    try {
      const next = await window.api.repoSettingsSet({
        repoPath,
        encoding,
        defaultBranch: defaultBranch.trim()
      })
      setSettings(next)
      setMsg(null)
    } catch {
      setMsg(t('error.generic'))
    } finally {
      setSaving(false)
    }
  }

  const cleanOrig = async (): Promise<void> => {
    if (!repoPath) return
    try {
      const removed = await window.api.repoCleanOrig(repoPath)
      const next = await window.api.repoSettingsGet(repoPath)
      setSettings(next)
      setMsg(tf('repoSettings.origDone', { n: removed.length }))
    } catch {
      setMsg(t('error.generic'))
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-semibold text-zinc-200">{t('repoSettings.title')}</div>
      <div className="text-xs text-zinc-500">{t('repoSettings.hint')}</div>
      {!repoPath && <div className="text-sm text-zinc-500">{t('repoSettings.noRepo')}</div>}
      {repoPath && settings && (
        <>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <span className="w-28 shrink-0">{t('repoSettings.encoding')}</span>
            <select
              className={`${inputClass()} w-40`}
              value={encoding}
              onChange={(e) => setEncoding(e.target.value)}
            >
              {ENCODINGS.map((enc) => (
                <option key={enc} value={enc}>
                  {enc}
                </option>
              ))}
            </select>
          </label>
          <div className="pl-28 text-xs text-zinc-500">{t('repoSettings.encodingHint')}</div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <span className="w-28 shrink-0">{t('repoSettings.defaultBranch')}</span>
            <input
              className={inputClass()}
              value={defaultBranch}
              onChange={(e) => setDefaultBranch(e.target.value)}
            />
          </label>
          <div className="pl-28 text-xs text-zinc-500">{t('repoSettings.defaultBranchHint')}</div>
          <div>
            <button className={btnPrimary()} disabled={saving} onClick={() => void save()}>
              {t('repoSettings.save')}
            </button>
          </div>

          <div className="text-sm font-semibold text-zinc-200">
            {t('repoSettings.orig')}
          </div>
          {settings.origFiles.length === 0 ? (
            <div className="text-xs text-zinc-500">{t('repoSettings.origNone')}</div>
          ) : (
            <>
              <div className="text-xs text-zinc-400">
                {tf('repoSettings.origCount', { n: settings.origFiles.length })}
              </div>
              <ul className="max-h-24 overflow-y-auto pl-4 text-xs text-zinc-500">
                {settings.origFiles.map((f) => (
                  <li key={f} className="truncate">
                    {f}
                  </li>
                ))}
              </ul>
              <div>
                <button className={btnGhost()} onClick={() => void cleanOrig()}>
                  {t('repoSettings.origClean')}
                </button>
              </div>
            </>
          )}
          {msg && <div className="text-xs text-zinc-400">{msg}</div>}
        </>
      )}
    </div>
  )
}

function ExternalToolsSection(): React.JSX.Element {
  const repoPath = useApp((s) => s.repoPath)
  const settings = useApp((s) => s.settings)
  const updateSettings = useApp((s) => s.updateSettings)
  const [editor, setEditor] = useState(settings.externalTools?.editor ?? '')
  const [diffTool, setDiffTool] = useState(settings.externalTools?.diffTool ?? '')
  const [mergeTool, setMergeTool] = useState(settings.externalTools?.mergeTool ?? '')
  const [terminal, setTerminal] = useState(settings.externalTools?.terminal ?? '')
  const [saving, setSaving] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  const save = async (): Promise<void> => {
    setSaving(true)
    try {
      await updateSettings({
        externalTools: { editor: editor.trim(), diffTool: diffTool.trim(), mergeTool: mergeTool.trim(), terminal: terminal.trim() }
      })
      setHint(null)
    } finally {
      setSaving(false)
    }
  }

  const launch = async (kind: 'editor' | 'terminal'): Promise<void> => {
    const command = kind === 'editor' ? editor : terminal
    if (!repoPath || command.trim() === '') {
      setHint(t('tools.empty'))
      return
    }
    try {
      await window.api.toolsOpen({ repoPath, kind })
      setHint(tf('tools.launched', { tool: command }))
    } catch {
      setHint(t('error.generic'))
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-semibold text-zinc-200">{t('tools.title')}</div>
      <div className="text-xs text-zinc-500">{t('tools.hint')}</div>
      {(
        [
          ['editor', editor, setEditor],
          ['diffTool', diffTool, setDiffTool],
          ['mergeTool', mergeTool, setMergeTool],
          ['terminal', terminal, setTerminal]
        ] as const
      ).map(([kind, value, setValue]) => (
        <label key={kind} className="flex items-center gap-2 text-sm text-zinc-300">
          <span className="w-24 shrink-0">{t(`tools.${kind}` as MessageKey)}</span>
          <input
            className={inputClass()}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
      ))}
      <div className="flex items-center gap-2">
        <button className={btnPrimary()} disabled={saving} onClick={() => void save()}>
          {t('tools.save')}
        </button>
        <button className={btnGhost()} onClick={() => void launch('editor')}>
          {t('tools.openRepo')}
        </button>
        <button className={btnGhost()} onClick={() => void launch('terminal')}>
          {t('tools.openTerminal')}
        </button>
      </div>
      {hint && <div className="text-xs text-zinc-400">{hint}</div>}
    </div>
  )
}

function SigningSection(): React.JSX.Element {
  const repoPath = useApp((s) => s.repoPath)
  const [status, setStatus] = useState<SigningStatusDto | null>(null)
  const [sign, setSign] = useState(false)
  const [format, setFormat] = useState<'openpgp' | 'ssh' | 'x509'>('ssh')
  const [key, setKey] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!repoPath) return
    let alive = true
    void window.api.signingStatus(repoPath).then((s) => {
      if (!alive) return
      setStatus(s)
      setSign(s.signCommits)
      setFormat(s.format === 'openpgp' || s.format === 'x509' ? s.format : 'ssh')
      setKey(s.signingKey)
    })
    return () => {
      alive = false
    }
  }, [repoPath])

  const save = async (): Promise<void> => {
    if (!repoPath || saving) return
    setSaving(true)
    try {
      setStatus(await window.api.signingSet({ repoPath, signCommits: sign, format, signingKey: key }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-semibold text-zinc-200">{t('signing.title')}</div>
      <div className="text-xs text-zinc-500">{t('signing.hint')}</div>
      {!repoPath && <div className="text-sm text-zinc-500">{t('signing.noRepo')}</div>}
      {repoPath && status && (
        <>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={sign}
              onChange={(e) => setSign(e.target.checked)}
            />
            <span>{t('signing.enable')}</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <span className="w-28 shrink-0">{t('signing.format')}</span>
            <select
              className={`${inputClass()} w-40`}
              value={format}
              onChange={(e) => setFormat(e.target.value as 'openpgp' | 'ssh' | 'x509')}
            >
              <option value="openpgp" disabled={!status.gpgInstalled}>
                {t('signing.formatOpenpgp')}
              </option>
              <option value="ssh" disabled={!status.sshAvailable}>
                {t('signing.formatSsh')}
              </option>
              <option value="x509">{t('signing.formatX509')}</option>
            </select>
          </label>
          {format === 'openpgp' && !status.gpgInstalled && (
            <div className="text-xs text-amber-500">{t('signing.noGpg')}</div>
          )}
          {format === 'ssh' && !status.sshAvailable && (
            <div className="text-xs text-amber-500">{t('signing.noSsh')}</div>
          )}
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <span className="w-28 shrink-0">{t('signing.key')}</span>
            <input
              className={inputClass()}
              value={key}
              placeholder={t('signing.keyPlaceholder')}
              onChange={(e) => setKey(e.target.value)}
            />
          </label>
          {format === 'ssh' && status.sshAvailable && (
            <div className="flex flex-wrap items-center gap-2 pl-28">
              {status.sshPublicKeys.length === 0 && (
                <span className="text-xs text-zinc-500">{t('signing.noSshKeys')}</span>
              )}
              {status.sshPublicKeys.map((k) => (
                <button
                  key={k.path}
                  className={btnGhost()}
                  onClick={() => setKey(k.path)}
                  title={k.path}
                >
                  {k.path.split('/').pop()}
                  {k.comment ? ` (${k.comment})` : ''}
                </button>
              ))}
            </div>
          )}
          <div>
            <button className={btnPrimary()} disabled={saving} onClick={() => void save()}>
              {t('signing.save')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const FLOW_KINDS = ['feature', 'release', 'hotfix'] as const
type FlowKind = (typeof FLOW_KINDS)[number]

const FLOW_KIND_KEY: Record<FlowKind, MessageKey> = {
  feature: 'gitflow.startFeature',
  release: 'gitflow.startRelease',
  hotfix: 'gitflow.startHotfix'
}

function GitflowSection(): React.JSX.Element {
  const repoPath = useApp((s) => s.repoPath)
  const refreshAll = useApp((s) => s.refreshAll)
  const [status, setStatus] = useState<GitflowStatusDto | null>(null)
  const [kind, setKind] = useState<FlowKind>('feature')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!repoPath) return
    let alive = true
    void window.api.gitflowStatus(repoPath).then((s) => {
      if (alive) setStatus(s)
    })
    return () => {
      alive = false
    }
  }, [repoPath])

  const run = async (fn: () => Promise<GitflowStatusDto>): Promise<void> => {
    if (!repoPath || busy) return
    setBusy(true)
    try {
      setStatus(await fn())
      await refreshAll()
    } finally {
      setBusy(false)
    }
  }

  const start = (): Promise<GitflowStatusDto> => {
    if (!repoPath) throw new Error('no repo')
    return window.api.gitflowStart({ repoPath, kind, name: name.trim() }).then((s) => {
      setName('')
      return s
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-semibold text-zinc-200">{t('gitflow.title')}</div>
      <div className="text-xs text-zinc-500">{t('gitflow.hint')}</div>
      {!repoPath && <div className="text-sm text-zinc-500">{t('gitflow.noRepo')}</div>}
      {repoPath && status && (
        <>
          {status.developExists ? (
            <div className="text-sm text-zinc-400">
              {tf('gitflow.developReady', { main: status.mainBranch })}
            </div>
          ) : (
            <div>
              <button
                className={btnPrimary()}
                disabled={busy}
                onClick={() => void run(() => window.api.gitflowInit(repoPath))}
              >
                {t('gitflow.init')}
              </button>
            </div>
          )}
          {status.currentBranch && (
            <div className="text-xs text-zinc-500">
              {tf('gitflow.current', { branch: status.currentBranch })}
            </div>
          )}
          {status.developExists && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                className={`${inputClass()} w-28`}
                value={kind}
                onChange={(e) => setKind(e.target.value as FlowKind)}
              >
                {FLOW_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t(FLOW_KIND_KEY[k])}
                  </option>
                ))}
              </select>
              <input
                className={inputClass()}
                value={name}
                placeholder={t('gitflow.branchName')}
                onChange={(e) => setName(e.target.value)}
              />
              <button className={btnGhost()} disabled={busy || !name.trim()} onClick={() => void run(start)}>
                {t(FLOW_KIND_KEY[kind])}
              </button>
            </div>
          )}
          {status.currentKind && (
            <div>
              <button
                className={btnGhost()}
                disabled={busy}
                onClick={() => {
                  const k = status.currentKind
                  if (!k) return
                  void run(() => window.api.gitflowFinish({ repoPath, kind: k }))
                }}
              >
                {tf('gitflow.finish', { kind: status.currentKind })}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function LfsSection(): React.JSX.Element {
  const repoPath = useApp((s) => s.repoPath)
  const [status, setStatus] = useState<LfsStatusDto | null>(null)
  const [fetchInclude, setFetchInclude] = useState('')
  const [fetchExclude, setFetchExclude] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!repoPath) return
    let alive = true
    void window.api.lfsStatus(repoPath).then((s) => {
      if (!alive) return
      setStatus(s)
      setFetchInclude(s.fetchInclude)
      setFetchExclude(s.fetchExclude)
    })
    return () => {
      alive = false
    }
  }, [repoPath])

  const save = async (): Promise<void> => {
    if (!repoPath || saving) return
    setSaving(true)
    try {
      const s = await window.api.lfsSetPolicy({ repoPath, fetchInclude, fetchExclude })
      setStatus(s)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-semibold text-zinc-200">{t('lfs.title')}</div>
      {!repoPath && <div className="text-sm text-zinc-500">{t('lfs.noRepo')}</div>}
      {repoPath && status && !status.installed && (
        <div className="text-sm text-zinc-500">{t('lfs.notInstalled')}</div>
      )}
      {repoPath && status?.installed && (
        <>
          {status.isLfsRepo ? (
            <div className="text-sm text-zinc-400">
              {tf('lfs.tracked', { n: status.trackedFiles })}
            </div>
          ) : (
            <div className="text-sm text-zinc-500">{t('lfs.notLfsRepo')}</div>
          )}
          <div className="text-xs text-zinc-500">{t('lfs.policyHint')}</div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <span className="w-40 shrink-0">{t('lfs.fetchInclude')}</span>
            <input
              className={inputClass()}
              value={fetchInclude}
              onChange={(e) => setFetchInclude(e.target.value)}
              placeholder="*.psd,*.zip"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <span className="w-40 shrink-0">{t('lfs.fetchExclude')}</span>
            <input
              className={inputClass()}
              value={fetchExclude}
              onChange={(e) => setFetchExclude(e.target.value)}
              placeholder="*.max"
            />
          </label>
          <div>
            <button className={btnPrimary()} disabled={saving} onClick={() => void save()}>
              {t('lfs.save')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function HooksSection(): React.JSX.Element {
  const repoPath = useApp((s) => s.repoPath)
  const [hooks, setHooks] = useState<HookDto[]>([])
  const [openHook, setOpenHook] = useState<string | null>(null)
  const [hookSource, setHookSource] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!repoPath) return
    let alive = true
    void window.api.hooksList(repoPath).then((list) => {
      if (alive) setHooks(list)
    })
    return () => {
      alive = false
    }
  }, [repoPath])

  const toggle = async (hook: HookDto): Promise<void> => {
    if (!repoPath || busy) return
    setBusy(true)
    try {
      setHooks(await window.api.hookSetEnabled({ repoPath, name: hook.name, enabled: !hook.enabled }))
    } finally {
      setBusy(false)
    }
  }

  const view = async (hook: HookDto): Promise<void> => {
    if (!repoPath) return
    if (openHook === hook.name) {
      setOpenHook(null)
      return
    }
    setHookSource(await window.api.hookRead(repoPath, hook.name))
    setOpenHook(hook.name)
  }

  // Only show hooks that exist or have a sample to copy from — the rest of
  // the standard list is noise.
  const rows = hooks.filter((h) => h.exists || h.sampleExists)

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-semibold text-zinc-200">{t('hooks.title')}</div>
      <div className="text-xs text-zinc-500">{t('hooks.hint')}</div>
      {!repoPath && <div className="text-sm text-zinc-500">{t('hooks.noRepo')}</div>}
      {repoPath && rows.length === 0 && (
        <div className="text-sm text-zinc-500">{t('hooks.empty')}</div>
      )}
      <div className="flex max-h-72 flex-col gap-1 overflow-auto">
        {rows.map((h) => (
          <div key={h.name} className="rounded bg-zinc-950 px-2 py-1">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className={h.enabled ? 'text-emerald-400' : 'text-zinc-500'}>
                {h.enabled ? '●' : '○'}
              </span>
              <span className="text-zinc-200">{h.name}</span>
              {h.custom && <span className="text-zinc-600">{t('hooks.custom')}</span>}
              <span className="flex-1" />
              {h.exists ? (
                <button className={btnGhost()} disabled={busy} onClick={() => void toggle(h)}>
                  {h.enabled ? t('hooks.disable') : t('hooks.enable')}
                </button>
              ) : (
                <span className="text-zinc-600">{t('hooks.empty')}</span>
              )}
              {h.exists && (
                <button className={btnGhost()} onClick={() => void view(h)}>
                  {openHook === h.name ? t('hooks.close') : t('hooks.view')}
                </button>
              )}
            </div>
            {openHook === h.name && (
              <pre className="mt-1 max-h-40 overflow-auto rounded bg-zinc-900 p-2 text-[11px] text-zinc-300">
                {hookSource || ' '}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
