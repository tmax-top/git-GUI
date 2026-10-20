import { useEffect, useState } from 'react'
import type { ActivityEntryDto } from '@shared/ipc'
import { useApp } from '../store'
import { t, tf, type MessageKey } from '../i18n'
import { Modal, btnPrimary, inputClass } from '../components/Modal'

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
  const [saving, setSaving] = useState(false)

  // NOTE: mounted by AppShell only while open, so the initial useState read
  // is the fresh store snapshot — no sync-from-store effect needed.

  const save = async (): Promise<void> => {
    setSaving(true)
    try {
      await updateSettings({ autoFetchInterval: interval, autoPrune: prune })
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

        <ActivityLog />
      </div>
    </Modal>
  )
}
