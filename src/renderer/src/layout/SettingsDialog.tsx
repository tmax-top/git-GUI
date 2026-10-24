import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faGear,
  faWandMagicSparkles,
  faCloud,
  faUser,
  faTerminal,
  faCodeBranch,
  faWrench,
  faEye,
  faEyeSlash
} from '@fortawesome/free-solid-svg-icons'
import type {
  ActivityEntryDto,
  GitflowStatusDto,
  HookDto,
  LfsStatusDto,
  RepoSettingsDto,
  SigningStatusDto,
  SubmoduleDetailDto
} from '@shared/ipc'
import { useApp } from '../store'
import { t, tf, type MessageKey } from '../i18n'
import { Modal, btnDanger, btnGhost, btnPrimary, inputClass } from '../components/Modal'

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

type SettingsTab = 'general' | 'ai' | 'integrations' | 'profiles' | 'terminal' | 'advanced' | 'tools'

const TAB_IDS: SettingsTab[] = ['general', 'ai', 'integrations', 'profiles', 'terminal', 'advanced', 'tools']

function AiSection(): React.JSX.Element {
  const settings = useApp((s) => s.settings)
  const updateSettings = useApp((s) => s.updateSettings)

  const [apiUrl, setApiUrl] = useState(settings.aiApiUrl ?? '')
  const [apiKey, setApiKey] = useState(settings.aiApiKey ?? '')
  const [model, setModel] = useState(settings.aiModel ?? 'gpt-4o-mini')
  const [prompt, setPrompt] = useState(settings.aiPrompt ?? '')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [showKey, setShowKey] = useState(false)

  const save = async (): Promise<void> => {
    setSaving(true)
    try {
      await updateSettings({
        aiApiUrl: apiUrl.trim(),
        aiApiKey: apiKey.trim(),
        aiModel: model.trim(),
        aiPrompt: prompt.trim()
      })
    } finally {
      setSaving(false)
    }
  }

  const runTest = async (): Promise<void> => {
    setTesting(true)
    setTestResult(null)
    try {
      await window.api.aiTestConnection({
        apiUrl: apiUrl.trim(),
        apiKey: apiKey.trim(),
        model: model.trim()
      })
      setTestResult({ ok: true, msg: t('ai.testSuccess') })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setTestResult({ ok: false, msg: tf('ai.testFail', { msg }) })
    } finally {
      setTesting(false)
    }
  }

  const applyPreset = (preset: { url: string; model: string }): void => {
    setApiUrl(preset.url)
    setModel(preset.model)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-sm font-semibold text-zinc-100">{t('ai.title')}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{t('ai.apiUrlHint')}</div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-400">{t('ai.presets')}:</span>
        <button
          type="button"
          className="rounded bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition cursor-pointer"
          onClick={() => applyPreset({ url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' })}
        >
          OpenAI (gpt-4o-mini)
        </button>
        <button
          type="button"
          className="rounded bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition cursor-pointer"
          onClick={() => applyPreset({ url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' })}
        >
          DeepSeek (deepseek-chat)
        </button>
        <button
          type="button"
          className="rounded bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition cursor-pointer"
          onClick={() => applyPreset({ url: 'http://localhost:11434/v1', model: 'qwen2.5-coder' })}
        >
          Ollama (qwen2.5-coder)
        </button>
      </div>

      <label className="flex flex-col gap-1 text-xs text-zinc-300">
        <span className="font-medium text-zinc-300">{t('ai.apiUrl')}</span>
        <input
          className={inputClass()}
          value={apiUrl}
          placeholder="https://api.openai.com/v1"
          onChange={(e) => setApiUrl(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-300">
        <span className="font-medium text-zinc-300">{t('ai.apiKey')}</span>
        <div className="flex gap-2">
          <input
            type={showKey ? 'text' : 'password'}
            className={inputClass()}
            value={apiKey}
            placeholder={t('ai.apiKeyPlaceholder')}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <button
            type="button"
            className={`${btnGhost()} px-3 shrink-0 flex items-center justify-center`}
            onClick={() => setShowKey((v) => !v)}
            title={showKey ? 'Hide' : 'Show'}
          >
            <FontAwesomeIcon icon={showKey ? faEyeSlash : faEye} className="h-3.5 w-3.5" />
          </button>
        </div>
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-300">
        <span className="font-medium text-zinc-300">{t('ai.model')}</span>
        <input
          className={inputClass()}
          value={model}
          placeholder="gpt-4o-mini"
          onChange={(e) => setModel(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-300">
        <span className="font-medium text-zinc-300">{t('ai.prompt')}</span>
        <textarea
          className={`${inputClass()} h-24 resize-none`}
          value={prompt}
          placeholder={t('ai.promptPlaceholder')}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </label>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          className={btnPrimary()}
          disabled={saving}
          onClick={() => void save()}
        >
          {t('common.save')}
        </button>
        <button
          type="button"
          className={btnGhost()}
          disabled={testing}
          onClick={() => void runTest()}
        >
          {testing ? t('ai.testing') : t('ai.test')}
        </button>
        {testResult && (
          <span className={`text-xs ${testResult.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
            {testResult.msg}
          </span>
        )}
      </div>
    </div>
  )
}

export function SettingsDialog(): React.JSX.Element {
  const close = useApp((s) => s.closeSettings)
  const settings = useApp((s) => s.settings)
  const updateSettings = useApp((s) => s.updateSettings)
  const initialTab = useApp((s) => s.settingsInitialTab)
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    (initialTab as SettingsTab) && TAB_IDS.includes(initialTab as SettingsTab)
      ? (initialTab as SettingsTab)
      : 'general'
  )
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

  const tabs: Array<{
    id: SettingsTab
    label: string
    icon: Parameters<typeof FontAwesomeIcon>[0]['icon']
  }> = [
    { id: 'general', label: t('settings.tabGeneral'), icon: faGear },
    { id: 'ai', label: t('settings.tabAi'), icon: faWandMagicSparkles },
    { id: 'integrations', label: t('settings.tabIntegrations'), icon: faCloud },
    { id: 'profiles', label: t('settings.tabProfiles'), icon: faUser },
    { id: 'terminal', label: t('settings.tabTerminal'), icon: faTerminal },
    { id: 'advanced', label: t('settings.tabAdvanced'), icon: faCodeBranch },
    { id: 'tools', label: t('settings.tabTools'), icon: faWrench }
  ]

  return (
    <Modal
      title={t('settings.title')}
      onClose={close}
      maxWidth="max-w-4xl"
      bodyClassName="p-0 overflow-hidden"
      footer={
        <button className={btnPrimary()} disabled={saving} onClick={() => void save()}>
          {t('common.confirm')}
        </button>
      }
    >
      <div className="flex h-[520px] divide-x divide-zinc-800">
        {/* Left tabs column */}
        <div className="w-44 shrink-0 bg-zinc-950/50 p-2 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`flex w-full items-center gap-2.5 rounded px-3 py-2 text-xs font-medium transition text-left cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`settings-tab-${tab.id}`}
            >
              <FontAwesomeIcon
                icon={tab.icon}
                className={`h-3.5 w-3.5 shrink-0 ${activeTab === tab.id ? 'text-emerald-400' : 'text-zinc-500'}`}
              />
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right content column */}
        <div className="flex-1 min-w-0 p-5 overflow-y-auto">
          {activeTab === 'general' && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <div className="text-sm font-semibold text-zinc-200">{t('settings.theme')}</div>
                <div className="flex gap-2">
                  {(['system', 'dark', 'light'] as const).map((mode) => (
                    <button
                      key={mode}
                      className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition ${
                        settings.theme === mode
                          ? 'bg-zinc-700 text-zinc-100 shadow'
                          : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                      }`}
                      onClick={() => void updateSettings({ theme: mode })}
                      data-testid={`theme-${mode}`}
                    >
                      {t(
                        mode === 'system'
                          ? 'settings.themeSystem'
                          : mode === 'dark'
                            ? 'settings.themeDark'
                            : 'settings.themeLight'
                      )}
                    </button>
                  ))}
                </div>
              </div>

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
            </div>
          )}

          {activeTab === 'ai' && <AiSection />}

          {activeTab === 'integrations' && <IntegrationsSection />}

          {activeTab === 'profiles' && (
            <div className="flex flex-col gap-6">
              <ProfilesSection />
              <SigningSection />
            </div>
          )}

          {activeTab === 'terminal' && <TerminalSection />}

          {activeTab === 'advanced' && (
            <div className="flex flex-col gap-6">
              <RepoSettingsSection />
              <GitflowSection />
              <SubmoduleSection />
              <LfsSection />
              <HooksSection />
            </div>
          )}

          {activeTab === 'tools' && <ExternalToolsSection />}
        </div>
      </div>
    </Modal>
  )
}

function SubmoduleSection(): React.JSX.Element {
  const repoPath = useApp((s) => s.repoPath)
  const refreshAll = useApp((s) => s.refreshAll)
  const [subs, setSubs] = useState<SubmoduleDetailDto[]>([])
  const [recurse, setRecurse] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const reload = async (): Promise<void> => {
    if (!repoPath) return
    const [details, recurseState] = await Promise.all([
      window.api.submoduleDetails(repoPath),
      window.api.submoduleGetRecurse(repoPath)
    ])
    setSubs(details)
    setRecurse(recurseState.recurse)
  }

  useEffect(() => {
    if (!repoPath) return
    let alive = true
    void window.api
      .submoduleDetails(repoPath)
      .then(async (details) => {
        const recurseState = await window.api.submoduleGetRecurse(repoPath)
        if (!alive) return
        setSubs(details)
        setRecurse(recurseState.recurse)
      })
      .catch(() => setSubs([]))
    return () => {
      alive = false
    }
  }, [repoPath])

  const run = async (fn: () => Promise<unknown>): Promise<void> => {
    if (busy || !repoPath) return
    setBusy(true)
    setMsg(null)
    try {
      await fn()
      await reload()
      void refreshAll()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t('error.generic'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-semibold text-zinc-200">{t('submodule.title')}</div>
      <div className="text-xs text-zinc-500">{t('submodule.hint')}</div>
      {!repoPath && <div className="text-sm text-zinc-500">{t('submodule.noRepo')}</div>}
      {repoPath && (
        <>
          {subs.length === 0 && <div className="text-sm text-zinc-500">{t('submodule.empty')}</div>}
          {subs.map((s) => (
            <div key={s.path} className="flex items-center gap-2 text-sm text-zinc-300">
              <span className="w-40 truncate" title={s.path}>
                {s.path}
              </span>
              <span
                className="w-20 text-xs"
                style={{ color: s.status === '+' ? '#f59e0b' : s.status === '-' ? '#f43f5e' : s.status === 'U' ? '#f43f5e' : '#10b981' }}
              >
                {s.status === '-'
                  ? t('submodule.statusInit')
                  : s.status === '+'
                    ? t('submodule.statusNew')
                    : s.status === 'U'
                      ? t('submodule.statusConflict')
                      : t('submodule.statusOk')}
              </span>
              <span className="font-mono text-xs text-zinc-600">{s.oid.slice(0, 7)}</span>
              <label className="flex items-center gap-1 text-xs text-zinc-400">
                <span>{t('submodule.policy')}</span>
                <select
                  className={`${inputClass()} w-36`}
                  value={s.update ?? ''}
                  disabled={busy}
                  onChange={(e) => {
                    const v = e.target.value === '' ? null : e.target.value
                    void run(() =>
                      window.api.submoduleSetUpdate({
                        repoPath: repoPath as string,
                        path: s.path,
                        strategy: v as 'checkout' | 'merge' | 'rebase' | 'none' | null
                      })
                    )
                  }}
                >
                  <option value="">{t('submodule.policyDefault')}</option>
                  <option value="checkout">checkout</option>
                  <option value="merge">merge</option>
                  <option value="rebase">rebase</option>
                  <option value="none">{t('submodule.policyNone')}</option>
                </select>
              </label>
              {s.status === '-' && (
                <button
                  className={btnGhost()}
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      window.api.submoduleInit({ repoPath: repoPath as string, path: s.path })
                    )
                  }
                >
                  {t('submodule.init')}
                </button>
              )}
              <button
                className={btnGhost()}
                disabled={busy}
                onClick={() =>
                  void run(() =>
                    window.api.submoduleUpdate({ repoPath: repoPath as string, path: s.path })
                  )
                }
              >
                {t('submodule.update')}
              </button>
            </div>
          ))}
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={recurse}
              disabled={busy}
              onChange={(e) =>
                void run(() =>
                  window.api.submoduleSetRecurse({
                    repoPath: repoPath as string,
                    value: e.target.checked
                  })
                )
              }
            />
            <span>{t('submodule.recurse')}</span>
          </label>
          {msg && <div className="text-xs text-rose-400">{msg}</div>}
        </>
      )}
    </div>
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

function TerminalSection(): React.JSX.Element {
  const settings = useApp((s) => s.settings)
  const updateSettings = useApp((s) => s.updateSettings)
  const [fontFamily, setFontFamily] = useState(settings.terminalFontFamily ?? '')
  const [fontSize, setFontSize] = useState(settings.terminalFontSize ?? 13)
  const [saving, setSaving] = useState(false)

  const save = async (): Promise<void> => {
    setSaving(true)
    try {
      await updateSettings({ terminalFontFamily: fontFamily.trim(), terminalFontSize: fontSize })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-semibold text-zinc-200">{t('terminal.title')}</div>
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <span className="w-24 shrink-0">{t('terminal.fontFamily')}</span>
        <input
          className={inputClass()}
          value={fontFamily}
          placeholder={t('terminal.fontFamilyPlaceholder')}
          onChange={(e) => setFontFamily(e.target.value)}
        />
      </label>
      <div className="flex flex-wrap items-center gap-1.5 pl-24 text-xs text-zinc-400">
        <span className="text-[11px] text-zinc-500">{t('terminal.presets')}:</span>
        <button
          type="button"
          className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[11px] hover:bg-zinc-700 hover:text-zinc-200"
          onClick={() => setFontFamily('Menlo, Monaco, monospace')}
        >
          Menlo (macOS)
        </button>
        <button
          type="button"
          className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[11px] hover:bg-zinc-700 hover:text-zinc-200"
          onClick={() => setFontFamily('"Cascadia Code", Consolas, monospace')}
        >
          Cascadia Code
        </button>
        <button
          type="button"
          className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[11px] hover:bg-zinc-700 hover:text-zinc-200"
          onClick={() => setFontFamily('"JetBrains Mono", monospace')}
        >
          JetBrains Mono
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <span className="w-24 shrink-0">{t('terminal.fontSize')}</span>
        <select
          className={`${inputClass()} w-24`}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
        >
          {[9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 24].map((n) => (
            <option key={n} value={n}>
              {n} px
            </option>
          ))}
        </select>
      </label>
      <div className="pt-2">
        <button className={btnPrimary()} disabled={saving} onClick={() => void save()}>
          {t('common.save')}
        </button>
      </div>
    </div>
  )
}

function ProfilesSection(): React.JSX.Element {
  const settings = useApp((s) => s.settings)
  const profiles = settings.profiles ?? []
  const activeId = settings.activeProfileId
  const createProfile = useApp((s) => s.createProfile)
  const deleteProfile = useApp((s) => s.deleteProfile)
  const setActiveProfile = useApp((s) => s.setActiveProfile)

  const [name, setName] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [authorEmail, setAuthorEmail] = useState('')
  const [signingKey, setSigningKey] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async (): Promise<void> => {
    if (!name.trim() || !authorName.trim() || !authorEmail.trim()) {
      setError(t('profile.fieldsRequired'))
      return
    }
    setAdding(true)
    setError(null)
    try {
      await createProfile(
        name.trim(),
        authorName.trim(),
        authorEmail.trim(),
        signingKey.trim() || undefined
      )
      setName('')
      setAuthorName('')
      setAuthorEmail('')
      setSigningKey('')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('error.generic'))
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="flex flex-col gap-3" data-testid="profiles-section">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-200">{t('profile.title')}</span>
        {activeId && (
          <button
            className={btnGhost() + ' text-[11px]'}
            onClick={() => void setActiveProfile(null)}
            data-testid="profile-clear-active-btn"
          >
            {t('profile.clearActive')}
          </button>
        )}
      </div>

      {/* Profiles list */}
      <div className="space-y-2">
        {profiles.map((p) => (
          <div
            key={p.id}
            className={`flex items-center justify-between rounded border p-3 text-xs transition ${
              activeId === p.id
                ? 'border-emerald-600/60 bg-emerald-950/20'
                : 'border-zinc-800 bg-zinc-950'
            }`}
            data-testid={`profile-item-${p.id}`}
          >
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-100">{p.name}</span>
                {activeId === p.id && (
                  <span className="rounded bg-emerald-900/60 px-1.5 py-0.2 text-[10px] text-emerald-400 font-medium">
                    {t('profile.active')}
                  </span>
                )}
              </div>
              <span className="text-zinc-400">
                {p.authorName} &lt;{p.authorEmail}&gt;
              </span>
              {p.signingKey && (
                <span className="font-mono text-[10px] text-zinc-500">Key: {p.signingKey}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {activeId !== p.id && (
                <button
                  className={btnPrimary() + ' text-[11px] px-2 py-1'}
                  onClick={() => void setActiveProfile(p.id)}
                  data-testid={`profile-set-active-${p.id}`}
                >
                  {t('profile.setActive')}
                </button>
              )}
              <button
                className={btnDanger() + ' text-[11px] px-2 py-1'}
                onClick={() => {
                  if (window.confirm(tf('profile.deleteConfirm', { name: p.name }))) {
                    void deleteProfile(p.id)
                  }
                }}
                data-testid={`profile-delete-${p.id}`}
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        ))}

        {profiles.length === 0 && (
          <div className="rounded border border-zinc-800 bg-zinc-950 p-4 text-center text-xs text-zinc-500">
            {t('profile.empty')}
          </div>
        )}
      </div>

      {/* New profile form */}
      <div className="flex flex-col gap-2 rounded border border-zinc-800 bg-zinc-900/40 p-3 text-xs">
        <span className="font-semibold text-zinc-300">{t('profile.new')}</span>
        <div className="grid grid-cols-2 gap-2">
          <input
            className={inputClass()}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('profile.namePlaceholder')}
            data-testid="profile-name-input"
          />
          <input
            className={inputClass()}
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder={t('profile.authorName')}
            data-testid="profile-author-input"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            className={inputClass()}
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
            placeholder={t('profile.authorEmail')}
            data-testid="profile-email-input"
          />
          <input
            className={inputClass()}
            value={signingKey}
            onChange={(e) => setSigningKey(e.target.value)}
            placeholder={t('profile.signingKey')}
            data-testid="profile-key-input"
          />
        </div>

        {error && <div className="text-rose-400 text-[11px]">{error}</div>}

        <div className="flex justify-end">
          <button
            className={btnPrimary()}
            disabled={adding || !name.trim() || !authorName.trim() || !authorEmail.trim()}
            onClick={() => void handleAdd()}
            data-testid="profile-add-btn"
          >
            {adding ? '…' : t('profile.new')}
          </button>
        </div>
      </div>
    </div>
  )
}

function IntegrationsSection(): React.JSX.Element {
  const accounts = useApp((s) => s.settings.providerAccounts ?? [])
  const connectPat = useApp((s) => s.connectProviderPat)
  const disconnect = useApp((s) => s.disconnectProvider)

  const ghAccount = accounts.find((a) => a.provider === 'github')
  const adoAccount = accounts.find((a) => a.provider === 'azuredevops')

  const [ghToken, setGhToken] = useState('')
  const [ghBusy, setGhBusy] = useState(false)
  const [ghErr, setGhErr] = useState<string | null>(null)

  const [adoToken, setAdoToken] = useState('')
  const [adoOrg, setAdoOrg] = useState('')
  const [adoBusy, setAdoBusy] = useState(false)
  const [adoErr, setAdoErr] = useState<string | null>(null)

  const handleConnectGh = async (): Promise<void> => {
    if (!ghToken.trim() || ghBusy) return
    setGhBusy(true)
    setGhErr(null)
    try {
      await connectPat('github', ghToken.trim())
      setGhToken('')
    } catch (e) {
      setGhErr(e instanceof Error ? e.message : t('error.generic'))
    } finally {
      setGhBusy(false)
    }
  }

  const handleConnectAdo = async (): Promise<void> => {
    if (!adoToken.trim() || adoBusy) return
    setAdoBusy(true)
    setAdoErr(null)
    try {
      await connectPat('azuredevops', adoToken.trim(), adoOrg.trim() || undefined)
      setAdoToken('')
    } catch (e) {
      setAdoErr(e instanceof Error ? e.message : t('error.generic'))
    } finally {
      setAdoBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm font-semibold text-zinc-200">{t('provider.integrations')}</div>

      {/* GitHub Card */}
      <div className="rounded border border-zinc-800 bg-zinc-950 p-3 text-xs" data-testid="integration-github">
        <div className="flex items-center justify-between font-medium text-zinc-200 mb-2">
          <div className="flex items-center gap-2">
            <span>{t('provider.github')}</span>
            {ghAccount ? (
              <span className="text-emerald-400 font-normal">
                {tf('provider.connectedAs', { name: ghAccount.displayName || ghAccount.username })}
              </span>
            ) : (
              <span className="text-zinc-500 font-normal">{t('provider.noAccount')}</span>
            )}
          </div>
          {ghAccount && (
            <button
              className={btnGhost()}
              onClick={() => void disconnect('github')}
              data-testid="gh-disconnect"
            >
              {t('provider.disconnect')}
            </button>
          )}
        </div>

        {!ghAccount && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-zinc-400 font-medium">
                {t('provider.pat')}
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  className={`${inputClass()} flex-1`}
                  value={ghToken}
                  onChange={(e) => setGhToken(e.target.value)}
                  placeholder={t('provider.patPlaceholder')}
                  data-testid="gh-pat-input"
                />
                <button
                  className={btnPrimary()}
                  disabled={!ghToken.trim() || ghBusy}
                  onClick={() => void handleConnectGh()}
                  data-testid="gh-connect-btn"
                >
                  {ghBusy ? '…' : t('provider.connect')}
                </button>
              </div>
            </div>
            {ghErr && <div className="text-rose-400 text-[11px]">{ghErr}</div>}
          </div>
        )}
      </div>

      {/* Azure DevOps Card */}
      <div className="rounded border border-zinc-800 bg-zinc-950 p-3 text-xs" data-testid="integration-azuredevops">
        <div className="flex items-center justify-between font-medium text-zinc-200 mb-2">
          <div className="flex items-center gap-2">
            <span>{t('provider.azuredevops')}</span>
            {adoAccount ? (
              <span className="text-emerald-400 font-normal">
                {tf('provider.connectedAs', { name: adoAccount.displayName || adoAccount.username })}
              </span>
            ) : (
              <span className="text-zinc-500 font-normal">{t('provider.noAccount')}</span>
            )}
          </div>
          {adoAccount && (
            <button
              className={btnGhost()}
              onClick={() => void disconnect('azuredevops')}
              data-testid="ado-disconnect"
            >
              {t('provider.disconnect')}
            </button>
          )}
        </div>

        {!adoAccount && (
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-zinc-400 font-medium">
                {t('provider.org')}
              </label>
              <input
                type="text"
                className={inputClass()}
                value={adoOrg}
                onChange={(e) => setAdoOrg(e.target.value)}
                placeholder={t('provider.orgPlaceholder')}
                data-testid="ado-org-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-zinc-400 font-medium">
                {t('provider.pat')}
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  className={`${inputClass()} flex-1`}
                  value={adoToken}
                  onChange={(e) => setAdoToken(e.target.value)}
                  placeholder={t('provider.patPlaceholder')}
                  data-testid="ado-pat-input"
                />
                <button
                  className={btnPrimary()}
                  disabled={!adoToken.trim() || adoBusy}
                  onClick={() => void handleConnectAdo()}
                  data-testid="ado-connect-btn"
                >
                  {adoBusy ? '…' : t('provider.connect')}
                </button>
              </div>
            </div>
            {adoErr && <div className="text-rose-400 text-[11px]">{adoErr}</div>}
          </div>
        )}
      </div>
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
