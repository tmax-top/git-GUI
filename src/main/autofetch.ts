import { logActivity } from './log/activity'

export interface AutoFetchSettings {
  autoFetchInterval: number
  autoPrune: boolean
}

export interface AutoFetchSession {
  openRepos: string[]
}

export interface AutoFetchDeps {
  loadSettings: () => Promise<AutoFetchSettings>
  loadSession: () => Promise<AutoFetchSession>
  /** Run `git fetch` for one open repo. */
  fetch: (repoPath: string, opts: { prune: boolean }) => Promise<void>
  /** Notify windows so the renderer refreshes refs/ahead-behind. */
  onChanged: (repoPath: string) => void
  /** Skip this tick (e.g. a manual sync op is in flight). */
  shouldSkip?: () => boolean
  /** Outcome observer (desktop notification); runs after the activity log. */
  onOutcome?: (repoPath: string, ok: boolean, message?: string) => void
  now?: () => number
}

const TICK_MS = 5_000
const MINUTE_MS = 60_000

/**
 * Background auto-fetch: every tick, fetch each open repo whose last fetch is
 * older than `autoFetchInterval` minutes (0 disables). Each run is recorded in
 * the activity log — success and failure alike.
 */
export class AutoFetchScheduler {
  private timer: NodeJS.Timeout | null = null
  private lastRun = new Map<string, number>()
  private ticking = false
  private readonly now: () => number

  constructor(private readonly deps: AutoFetchDeps) {
    this.now = deps.now ?? Date.now
  }

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => void this.tick(), TICK_MS)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  /** One scheduler pass; exposed so tests can drive it without timers. */
  async tick(): Promise<void> {
    if (this.ticking) return
    if (this.deps.shouldSkip?.()) return
    this.ticking = true
    try {
      const settings = await this.deps.loadSettings()
      const interval = settings.autoFetchInterval
      if (interval <= 0) return
      const session = await this.deps.loadSession()
      const now = this.now()
      for (const repoPath of session.openRepos) {
        const last = this.lastRun.get(repoPath) ?? 0
        if (now - last < interval * MINUTE_MS) continue
        // Stamp before running so a failing fetch backs off a full interval too.
        this.lastRun.set(repoPath, now)
        try {
          await this.deps.fetch(repoPath, { prune: settings.autoPrune })
          await logActivity({ kind: 'auto-fetch', repoPath, ok: true })
          this.deps.onChanged(repoPath)
          this.deps.onOutcome?.(repoPath, true)
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e)
          await logActivity({
            kind: 'auto-fetch',
            repoPath,
            ok: false,
            message
          })
          this.deps.onOutcome?.(repoPath, false, message)
        }
      }
    } finally {
      this.ticking = false
    }
  }

  /** Test helper: forget per-repo fetch times. */
  resetForTests(): void {
    this.lastRun.clear()
  }
}
