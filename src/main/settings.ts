import { app } from 'electron'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export interface FavoriteRepo {
  name: string
  path: string
}

export interface AppSettings {
  favorites: FavoriteRepo[]
  recent: string[]
  graphInitialLimit: number
  defaultBranch: string
  language: 'system' | 'zh' | 'en'
  leftPanelWidth: number
  rightPanelWidth: number
  graphSplitPct: number
  graphAuthorWidth: number
  graphDateWidth: number
  graphOidWidth: number
  /** Background auto-fetch period in minutes; 0 = disabled. */
  autoFetchInterval: number
  /** Pass `--prune` on auto-fetch to drop stale remote-tracking refs. */
  autoPrune: boolean
  /** Desktop notifications for push completion / conflicts / fetch failures. */
  notifications: boolean
  /** Command lines for external tools; empty string = feature off. */
  externalTools: {
    editor: string
    diffTool: string
    mergeTool: string
    terminal: string
  }
  /** Font family for the embedded terminal; empty = xterm default. */
  terminalFontFamily: string
  /** Font size (px) for the embedded terminal, 8–32. */
  terminalFontSize: number
  /** Terminal panel height in px, 120–600. */
  terminalHeight: number
  /** Connected GitProvider accounts (GitHub, Azure DevOps); tokens stored in secrets. */
  providerAccounts: import('../shared/providers').ProviderAccountDto[]
}

export interface SessionState {
  openRepos: string[]
  activeRepo: string | null
}

const DEFAULT_SETTINGS: AppSettings = {
  favorites: [],
  recent: [],
  graphInitialLimit: 500,
  defaultBranch: 'main',
  language: 'system',
  leftPanelWidth: 224,
  rightPanelWidth: 320,
  graphSplitPct: 55,
  graphAuthorWidth: 112,
  graphDateWidth: 48,
  graphOidWidth: 40,
  autoFetchInterval: 0,
  autoPrune: true,
  notifications: true,
  externalTools: { editor: '', diffTool: '', mergeTool: '', terminal: '' },
  terminalFontFamily: '',
  terminalFontSize: 13,
  terminalHeight: 240,
  providerAccounts: []
}

const DEFAULT_SESSION: SessionState = {
  openRepos: [],
  activeRepo: null
}

function settingsDir(): string {
  return app.getPath('userData')
}

function settingsFile(): string {
  return join(settingsDir(), 'settings.json')
}

function sessionFile(): string {
  return join(settingsDir(), 'session.json')
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(file, 'utf8')
    const parsed = JSON.parse(raw) as Partial<T>
    return { ...fallback, ...parsed }
  } catch {
    return fallback
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(settingsDir(), { recursive: true })
  await writeFile(file, JSON.stringify(value, null, 2), 'utf8')
}

export function loadSettings(): Promise<AppSettings> {
  return readJson(settingsFile(), DEFAULT_SETTINGS)
}

export function saveSettings(settings: AppSettings): Promise<void> {
  return writeJson(settingsFile(), settings)
}

export function loadSession(): Promise<SessionState> {
  return readJson(sessionFile(), DEFAULT_SESSION)
}

export function saveSession(session: SessionState): Promise<void> {
  return writeJson(sessionFile(), session)
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await loadSettings()
  const next = { ...current, ...patch }
  await saveSettings(next)
  return next
}

export async function updateSession(patch: Partial<SessionState>): Promise<SessionState> {
  const current = await loadSession()
  const next = { ...current, ...patch }
  await saveSession(next)
  return next
}
