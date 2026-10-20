import { execGit, execGitOrThrow } from './exec'
import { listSubmodules, type SubmoduleInfo } from './ops'

export { listSubmodules }
export type { SubmoduleInfo }

/** Keep-up-to-date strategies for `submodule.<path>.update`. */
export const SUBMODULE_UPDATE_STRATEGIES = ['checkout', 'merge', 'rebase', 'none'] as const
export type SubmoduleUpdateStrategy = (typeof SUBMODULE_UPDATE_STRATEGIES)[number]

/**
 * `git submodule update --init [--recursive] [path]` — initializes and/or
 * brings the submodule(s) to the recorded commit.
 */
export async function submoduleUpdate(
  repoPath: string,
  path?: string,
  recursive = false
): Promise<void> {
  const args = ['submodule', 'update', '--init']
  if (recursive) args.push('--recursive')
  if (path) args.push('--', path)
  await execGitOrThrow({ cwd: repoPath, args })
}

/** `git submodule init [path]` — register .gitmodules values in .git/config. */
export async function submoduleInit(repoPath: string, path?: string): Promise<void> {
  const args = ['submodule', 'init']
  if (path) args.push('--', path)
  await execGitOrThrow({ cwd: repoPath, args })
}

/**
 * Read the per-submodule update policy; `null` means git's default (checkout).
 */
export async function getSubmoduleUpdate(
  repoPath: string,
  path: string
): Promise<SubmoduleUpdateStrategy | null> {
  const result = await execGit({
    cwd: repoPath,
    args: ['config', '--get', `submodule.${path}.update`]
  })
  if (result.code !== 0) return null
  const value = result.stdout.trim()
  return (SUBMODULE_UPDATE_STRATEGIES as readonly string[]).includes(value)
    ? (value as SubmoduleUpdateStrategy)
    : null
}

/**
 * Keep-up-to-date policy: `submodule.<path>.update`. `null` unsets the
 * override (git default); `'none'` explicitly skips updating.
 */
export async function setSubmoduleUpdate(
  repoPath: string,
  path: string,
  strategy: SubmoduleUpdateStrategy | null
): Promise<void> {
  if (path === '' || path.includes('\0')) throw new Error('invalid submodule path')
  const key = `submodule.${path}.update`
  if (strategy == null) {
    const result = await execGit({ cwd: repoPath, args: ['config', '--unset', key] })
    if (result.code !== 0 && result.code !== 5) {
      throw new Error(result.stderr.trim() || `git config --unset ${key} failed`)
    }
  } else {
    await execGitOrThrow({ cwd: repoPath, args: ['config', key, strategy] })
  }
}

/** Whether `git pull --recurse-submodules` behaviour is on for this repo. */
export async function getSubmoduleRecurse(repoPath: string): Promise<boolean> {
  const result = await execGit({ cwd: repoPath, args: ['config', '--get', 'submodule.recurse'] })
  return result.code === 0 && result.stdout.trim() === 'true'
}

export async function setSubmoduleRecurse(repoPath: string, value: boolean): Promise<void> {
  await execGitOrThrow({
    cwd: repoPath,
    args: ['config', 'submodule.recurse', value ? 'true' : 'false']
  })
}

export interface SubmoduleDetail extends SubmoduleInfo {
  update: SubmoduleUpdateStrategy | null
}

/** Full submodule view: status + per-path keep-up-to-date policy. */
export async function submoduleDetails(repoPath: string): Promise<SubmoduleDetail[]> {
  const subs = await listSubmodules(repoPath)
  return Promise.all(
    subs.map(async (s) => ({ ...s, update: await getSubmoduleUpdate(repoPath, s.path) }))
  )
}
