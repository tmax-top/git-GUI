import { watch, type FSWatcher } from 'node:fs'
import { join } from 'node:path'

const DEBOUNCE_MS = 300

// Files under .git whose changes must trigger a status/log refresh.
function isRelevantGitFile(rest: string): boolean {
  if (rest === 'HEAD' || rest === 'index' || rest === 'MERGE_HEAD' || rest === 'ORIG_HEAD') return true
  if (rest === 'packed-refs') return true
  if (rest.startsWith('refs/')) return true
  if (rest.startsWith('rebase-merge/') || rest.startsWith('rebase-apply/')) return true
  return false
}

function isRelevant(filename: string | null): boolean {
  if (!filename) return true
  const norm = filename.replace(/\\/g, '/')
  if (norm === '.git' || norm.startsWith('.git/')) {
    return isRelevantGitFile(norm.slice('.git/'.length))
  }
  return true
}

export class RepoWatcher {
  private watchers = new Map<string, FSWatcher>()
  private timers = new Map<string, NodeJS.Timeout>()

  start(repoPath: string, onChange: (repoPath: string) => void): void {
    this.stop(repoPath)
    try {
      const watcher = watch(
        repoPath,
        { recursive: true },
        (_event, filename) => {
          if (!isRelevant(filename)) return
          const existing = this.timers.get(repoPath)
          if (existing) clearTimeout(existing)
          this.timers.set(
            repoPath,
            setTimeout(() => {
              this.timers.delete(repoPath)
              onChange(repoPath)
            }, DEBOUNCE_MS)
          )
        }
      )
      watcher.on('error', () => {
        // A broken watch must never crash the app; refresh still happens on user actions.
        this.stop(repoPath)
      })
      this.watchers.set(repoPath, watcher)
    } catch {
      // Recursive watch unsupported on this platform — degraded but functional.
    }
  }

  stop(repoPath: string): void {
    const watcher = this.watchers.get(repoPath)
    if (watcher) {
      watcher.close()
      this.watchers.delete(repoPath)
    }
    const timer = this.timers.get(repoPath)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(repoPath)
    }
  }

  stopAll(): void {
    for (const path of [...this.watchers.keys()]) this.stop(path)
  }

  watched(): string[] {
    return [...this.watchers.keys()]
  }
}

export function repoGitDir(repoPath: string): string {
  return join(repoPath, '.git')
}
