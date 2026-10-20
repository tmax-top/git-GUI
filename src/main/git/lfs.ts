import { execGit } from './exec'

export interface LfsStatus {
  /** `git lfs` is available on PATH. */
  installed: boolean
  /** The repo tracks at least one LFS object (filter=lfs in .gitattributes). */
  isLfsRepo: boolean
  /** Number of files reported by `git lfs ls-files` (0 when not installed). */
  trackedFiles: number
  /** `lfs.fetchinclude` config (glob filter of objects to fetch). */
  fetchInclude: string
  /** `lfs.fetchexclude` config. */
  fetchExclude: string
}

/** Probe `git lfs version` once per call — cheap and always accurate. */
export async function isLfsInstalled(): Promise<boolean> {
  const result = await execGit({ cwd: process.cwd(), args: ['lfs', 'version'] })
  return result.code === 0
}

async function gitConfig(repoPath: string, key: string): Promise<string> {
  const result = await execGit({ cwd: repoPath, args: ['config', '--get', key] })
  return result.code === 0 ? result.stdout.trim() : ''
}

async function countLfsTracked(repoPath: string): Promise<number> {
  // `git lfs ls-files -n` prints one path per line; no LFS install → error.
  const result = await execGit({ cwd: repoPath, args: ['lfs', 'ls-files', '-n'] })
  if (result.code !== 0) return 0
  return result.stdout.split('\n').filter((l) => l.trim()).length
}

async function hasLfsAttributes(repoPath: string): Promise<boolean> {
  // Search all tracked .gitattributes for the lfs filter declaration.
  const result = await execGit({
    cwd: repoPath,
    args: ['grep', '--cached', '-l', '-e', 'filter=lfs', '--', ':(glob)**/.gitattributes', '.gitattributes']
  })
  return result.code === 0 && result.stdout.trim().length > 0
}

export async function lfsStatus(repoPath: string): Promise<LfsStatus> {
  const installed = await isLfsInstalled()
  const [isLfsRepo, trackedFiles, fetchInclude, fetchExclude] = await Promise.all([
    hasLfsAttributes(repoPath),
    installed ? countLfsTracked(repoPath) : Promise.resolve(0),
    gitConfig(repoPath, 'lfs.fetchinclude'),
    gitConfig(repoPath, 'lfs.fetchexclude')
  ])
  return { installed, isLfsRepo, trackedFiles, fetchInclude, fetchExclude }
}

/**
 * Set the LFS pull policy: which objects to fetch (include) and which to skip
 * (exclude). Empty string unsets the key entirely.
 */
export async function setLfsFetchPolicy(
  repoPath: string,
  opts: { fetchInclude?: string; fetchExclude?: string }
): Promise<void> {
  for (const [key, value] of [
    ['lfs.fetchinclude', opts.fetchInclude],
    ['lfs.fetchexclude', opts.fetchExclude]
  ] as const) {
    if (value === undefined) continue
    if (value.trim() === '') {
      await execGit({ cwd: repoPath, args: ['config', '--unset', key] })
    } else {
      await execGit({ cwd: repoPath, args: ['config', key, value] })
    }
  }
}
