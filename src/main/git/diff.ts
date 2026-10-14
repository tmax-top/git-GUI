import { execGit, execGitOrThrow } from './exec'
import { parseUnifiedDiff, type DiffFile } from '../../shared/diff'

export { parseUnifiedDiff }
export type { DiffFile, DiffHunk, DiffLine } from '../../shared/diff'

export interface DiffOptions {
  cached?: boolean
  paths?: string[]
  contextLines?: number
  signal?: AbortSignal
}

export async function getDiff(repoPath: string, opts: DiffOptions = {}): Promise<DiffFile[]> {
  return parseUnifiedDiff(await getDiffText(repoPath, opts))
}

export async function getDiffText(repoPath: string, opts: DiffOptions = {}): Promise<string> {
  const args = ['diff']
  if (opts.cached) args.push('--cached')
  if (opts.contextLines != null) args.push(`-U${opts.contextLines}`)
  if (opts.paths && opts.paths.length > 0) {
    args.push('--', ...opts.paths)
  }
  const { stdout } = await execGitOrThrow({ cwd: repoPath, args, signal: opts.signal })
  return stdout
}

/**
 * Diff for an untracked file (not in the index): `git diff --no-index /dev/null <path>`.
 * Exit code 1 means "files differ" — that is success for no-index.
 */
export async function getUntrackedDiff(
  repoPath: string,
  path: string,
  signal?: AbortSignal
): Promise<string> {
  const result = await execGit({
    cwd: repoPath,
    args: ['diff', '--no-index', '--', '/dev/null', path],
    signal
  })
  if (result.code !== 0 && result.code !== 1) {
    throw new Error(`git diff --no-index failed (${result.code}): ${result.stderr.trim()}`)
  }
  return result.stdout
}

export async function getCommitDiffText(
  repoPath: string,
  oid: string,
  opts: { paths?: string[]; signal?: AbortSignal } = {}
): Promise<string> {
  // `git show` on a merge commit emits a combined diff that is usually empty —
  // diff against the first parent instead (what GitKraken/Sourcetree show).
  const rev = await execGit({
    cwd: repoPath,
    args: ['rev-list', '--parents', '-n', '1', oid],
    signal: opts.signal
  })
  const parents = rev.code === 0 ? rev.stdout.trim().split(/\s+/).slice(1) : []

  const args =
    parents.length >= 2
      ? ['diff', parents[0], oid]
      : ['show', '--format=', oid]
  if (opts.paths && opts.paths.length > 0) {
    args.push('--', ...opts.paths)
  }
  const { stdout } = await execGitOrThrow({ cwd: repoPath, args, signal: opts.signal })
  return stdout
}
