import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { setActiveProfileConfig } from './git/exec'

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
  theme: 'system' | 'dark' | 'light'
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
  commitBoxHeight: number
  /** Connected GitProvider accounts (GitHub, Azure DevOps); tokens stored in secrets. */
  providerAccounts: import('../shared/providers').ProviderAccountDto[]
  /** Workspaces grouping multiple repositories. */
  workspaces: import('../shared/ipc').WorkspaceDto[]
  /** Active workspace ID, or null. */
  activeWorkspaceId: string | null
  /** Git identity profiles. */
  profiles: import('../shared/ipc').ProfileDto[]
  /** Active profile ID, or null. */
  activeProfileId: string | null
  /** AI Commit message settings. */
  aiApiUrl?: string
  aiApiKey?: string
  aiModel?: string
  aiPrompt?: string
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
  theme: 'system',
  leftPanelWidth: 224,
  rightPanelWidth: 320,
  graphSplitPct: 55,
  graphAuthorWidth: 112,
  graphDateWidth: 96,
  graphOidWidth: 64,
  autoFetchInterval: 0,
  autoPrune: true,
  notifications: true,
  externalTools: { editor: '', diffTool: '', mergeTool: '', terminal: '' },
  terminalFontFamily: '',
  terminalFontSize: 13,
  terminalHeight: 240,
  commitBoxHeight: 208,
  providerAccounts: [],
  workspaces: [],
  activeWorkspaceId: null,
  profiles: [],
  activeProfileId: null,
  aiApiUrl: '',
  aiApiKey: '',
  aiModel: 'gpt-4o-mini',
  aiPrompt: ''
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

export function syncProfileConfig(settings: AppSettings): void {
  const active = (settings.profiles ?? []).find((p) => p.id === settings.activeProfileId)
  if (active) {
    setActiveProfileConfig({
      name: active.authorName,
      email: active.authorEmail,
      signingKey: active.signingKey
    })
  } else {
    setActiveProfileConfig(null)
  }
}

export async function loadSettings(): Promise<AppSettings> {
  const s = await readJson(settingsFile(), DEFAULT_SETTINGS)
  syncProfileConfig(s)
  return s
}

export function saveSettings(settings: AppSettings): Promise<void> {
  syncProfileConfig(settings)
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
