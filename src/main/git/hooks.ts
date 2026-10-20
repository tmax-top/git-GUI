import { chmod, readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * The standard git hook names, in git's own docs order. Anything else found
 * in `.git/hooks` is surfaced too (custom hooks), sorted after these.
 */
export const KNOWN_HOOKS = [
  'applypatch-msg',
  'pre-applypatch',
  'post-applypatch',
  'pre-commit',
  'pre-merge-commit',
  'prepare-commit-msg',
  'commit-msg',
  'post-commit',
  'pre-rebase',
  'post-checkout',
  'post-merge',
  'pre-push',
  'pre-auto-gc',
  'post-rewrite',
  'sendemail-validate',
  'fsmonitor-watchman',
  'p4-changelist',
  'p4-prepare-changelist',
  'p4-post-changelist',
  'p4-pre-submit',
  'post-index-change',
  'reference-transaction',
  'push-to-checkout',
  'pre-receive',
  'update',
  'proc-receive',
  'post-receive',
  'post-update'
] as const

export interface HookInfo {
  name: string
  /** Hook file exists in .git/hooks. */
  exists: boolean
  /** Exists and is executable — git only runs executable hooks. */
  enabled: boolean
  /** git ships a `.sample` for this hook. */
  sampleExists: boolean
  /** Hook name is not one of the standard ones (user-authored). */
  custom: boolean
}

const HOOK_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/

function hooksDirPath(repoPath: string): string {
  // `git rev-parse --git-path hooks` respects core.hooksPath; for now the
  // conventional location covers worktrees too (per-worktree .git dir).
  return join(repoPath, '.git', 'hooks')
}

async function isExecutable(path: string): Promise<boolean> {
  try {
    const s = await stat(path)
    // Any execute bit for user/group/other counts, matching git's check.
    return (s.mode & 0o111) !== 0
  } catch {
    return false
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

/** List every hook for a repo: standard ones first, then custom. */
export async function listHooks(repoPath: string): Promise<HookInfo[]> {
  const dir = hooksDirPath(repoPath)
  const known = new Set<string>(KNOWN_HOOKS)

  // Discover custom hook files (anything that isn't *.sample).
  let files: string[]
  try {
    files = await readdir(dir)
  } catch {
    files = [] // no hooks dir yet — still report the standard set
  }
  const custom = files.filter((f) => !known.has(f) && !f.endsWith('.sample'))

  const names = [...KNOWN_HOOKS, ...custom.sort()]
  const out: HookInfo[] = []
  for (const name of names) {
    const path = join(dir, name)
    const fileExists = await exists(path)
    out.push({
      name,
      exists: fileExists,
      enabled: fileExists && (await isExecutable(path)),
      sampleExists: await exists(path + '.sample'),
      custom: !known.has(name)
    })
  }
  return out
}

/** Read a hook's script contents (empty string when the file doesn't exist). */
export async function readHook(repoPath: string, name: string): Promise<string> {
  if (!HOOK_NAME_RE.test(name)) throw new Error(`invalid hook name: ${name}`)
  const dir = hooksDirPath(repoPath)
  try {
    return await readFile(join(dir, name), 'utf8')
  } catch {
    return ''
  }
}

/**
 * Enable/disable a hook via the executable bit (what git actually checks).
 * Creating a missing hook is out of scope — toggling only applies to existing
 * files; enabling a missing hook is a no-op error the caller surfaces.
 */
export async function setHookEnabled(
  repoPath: string,
  name: string,
  enabled: boolean
): Promise<void> {
  if (!HOOK_NAME_RE.test(name)) throw new Error(`invalid hook name: ${name}`)
  const dir = hooksDirPath(repoPath)
  const path = join(dir, name)
  if (!(await exists(path))) throw new Error(`hook not found: ${name}`)
  // 0755 vs 0644 keeps group/other readable; owner gets the x bit we care about.
  await chmod(path, enabled ? 0o755 : 0o644)
}
