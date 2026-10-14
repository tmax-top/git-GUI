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
  graphOidWidth: 40
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
