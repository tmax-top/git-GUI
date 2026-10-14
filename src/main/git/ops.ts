import { execGit, execGitOrThrow } from './exec'
import { parseProgressChunk, type ProgressEvent } from './progress'
import { repoQueue } from './queue'

export interface RefInfo {
  name: string
  fullName: string
  oid: string
  upstream?: string
  isRemote: boolean
  subject?: string
}

// Tab-separated fields. Refnames cannot contain tabs/control chars, so
// newline-delimited records are safe (for-each-ref has no -z on all versions).
const REF_FORMAT = '%(refname:short)\t%(refname)\t%(objectname)\t%(upstream:short)\t%(subject)'

function parseRefs(stdout: string, isRemote: boolean): RefInfo[] {
  const refs: RefInfo[] = []
  for (const record of stdout.split('\n')) {
    if (!record.trim()) continue
    const f = record.split('\t')
    if (f.length < 3) continue
    refs.push({
      name: f[0],
      fullName: f[1],
      oid: f[2],
      upstream: f[3] || undefined,
      isRemote,
      // subject may itself contain tabs — keep the remainder intact
      subject: f.length > 4 ? f.slice(4).join('\t') || undefined : undefined
    })
  }
  return refs
}

export async function listBranches(repoPath: string, signal?: AbortSignal): Promise<RefInfo[]> {
  const [local, remote] = await Promise.all([
    execGitOrThrow({
      cwd: repoPath,
      args: ['for-each-ref', `--format=${REF_FORMAT}`, 'refs/heads'],
      signal
    }),
    execGitOrThrow({
      cwd: repoPath,
      args: ['for-each-ref', `--format=${REF_FORMAT}`, 'refs/remotes'],
      signal
    })
  ])
  return [...parseRefs(local.stdout, false), ...parseRefs(remote.stdout, true)]
}

export async function listTags(repoPath: string, signal?: AbortSignal): Promise<RefInfo[]> {
  const { stdout } = await execGitOrThrow({
    cwd: repoPath,
    args: ['for-each-ref', `--format=${REF_FORMAT}`, 'refs/tags'],
    signal
  })
  return parseRefs(stdout, false)
}

export async function initRepo(repoPath: string, defaultBranch = 'main'): Promise<void> {
  await repoQueue.run(repoPath, () =>
    execGitOrThrow({ cwd: repoPath, args: ['init', '-b', defaultBranch] })
  )
}

export async function cloneRepo(
  url: string,
  targetDir: string,
  opts: { depth?: number; onProgress?: (e: ProgressEvent) => void; signal?: AbortSignal } = {},
  parentDir = targetDir
): Promise<void> {
  const args = ['clone']
  if (opts.depth != null) args.push('--depth', String(opts.depth))
  args.push('--', url, targetDir)
  const result = await execGit({
    cwd: parentDir,
    args,
    signal: opts.signal,
    onStderr: opts.onProgress
      ? (chunk): void => {
          for (const e of parseProgressChunk(chunk)) opts.onProgress?.(e)
        }
      : undefined
  })
  if (result.code !== 0) {
    throw new Error(`git clone failed (${result.code}): ${result.stderr.trim() || result.stdout.trim()}`)
  }
}

export async function addPaths(repoPath: string, paths: string[]): Promise<void> {
  await repoQueue.run(repoPath, () => execGitOrThrow({ cwd: repoPath, args: ['add', '--', ...paths] }))
}

export async function unstagePaths(repoPath: string, paths: string[]): Promise<void> {
  await repoQueue.run(repoPath, async () => {
    // On an unborn HEAD (no commits yet) `restore --staged` cannot resolve HEAD.
    const head = await execGit({ cwd: repoPath, args: ['rev-parse', '--verify', 'HEAD'] })
    if (head.code === 0) {
      await execGitOrThrow({ cwd: repoPath, args: ['restore', '--staged', '--', ...paths] })
    } else {
      await execGitOrThrow({ cwd: repoPath, args: ['rm', '--cached', '--force', '--', ...paths] })
    }
  })
}

export async function discardPaths(repoPath: string, paths: string[]): Promise<void> {
  await repoQueue.run(repoPath, () =>
    execGitOrThrow({ cwd: repoPath, args: ['restore', '--worktree', '--', ...paths] })
  )
}

/** Delete untracked files (never directories, never ignored files). */
export async function cleanPaths(repoPath: string, paths: string[]): Promise<void> {
  await repoQueue.run(repoPath, () =>
    execGitOrThrow({ cwd: repoPath, args: ['clean', '-f', '--', ...paths] })
  )
}

export interface CommitOptions {
  message: string
  amend?: boolean
  signoff?: boolean
}

export async function commit(repoPath: string, opts: CommitOptions): Promise<string> {
  return repoQueue.run(repoPath, async () => {
    const args = ['commit', '-m', opts.message]
    if (opts.amend) args.push('--amend')
    if (opts.signoff) args.push('--signoff')
    const { stdout } = await execGitOrThrow({ cwd: repoPath, args })
    const m = /\[[^\]]*\s([0-9a-f]{7,40})\]/.exec(stdout)
    return m ? m[1] : ''
  })
}

export async function createBranch(repoPath: string, name: string, startPoint?: string): Promise<void> {
  await repoQueue.run(repoPath, () => {
    const args = ['branch', name]
    if (startPoint) args.push(startPoint)
    return execGitOrThrow({ cwd: repoPath, args })
  })
}

export async function checkout(repoPath: string, target: string): Promise<void> {
  await repoQueue.run(repoPath, () => execGitOrThrow({ cwd: repoPath, args: ['checkout', target] }))
}

export interface SyncOptions {
  onProgress?: (e: ProgressEvent) => void
  signal?: AbortSignal
}

export async function fetch(repoPath: string, opts: SyncOptions = {}): Promise<void> {
  const result = await execGit({
    cwd: repoPath,
    args: ['fetch', '--progress', '--all', '--prune'],
    signal: opts.signal,
    onStderr: opts.onProgress
      ? (chunk): void => {
          for (const e of parseProgressChunk(chunk)) opts.onProgress?.(e)
        }
      : undefined
  })
  if (result.code !== 0) {
    throw new Error(`git fetch failed (${result.code}): ${result.stderr.trim()}`)
  }
}

export async function pull(
  repoPath: string,
  opts: SyncOptions & { rebase?: boolean; ffOnly?: boolean } = {}
): Promise<void> {
  const args = ['pull', '--progress']
  if (opts.rebase) args.push('--rebase')
  if (opts.ffOnly) args.push('--ff-only')
  const result = await execGit({
    cwd: repoPath,
    args,
    signal: opts.signal,
    onStderr: opts.onProgress
      ? (chunk): void => {
          for (const e of parseProgressChunk(chunk)) opts.onProgress?.(e)
        }
      : undefined
  })
  if (result.code !== 0) {
    throw new Error(`git pull failed (${result.code}): ${result.stderr.trim()}`)
  }
}

export async function push(
  repoPath: string,
  opts: SyncOptions & { forceWithLease?: boolean; setUpstream?: string } = {}
): Promise<void> {
  const args = ['push', '--progress']
  if (opts.forceWithLease) args.push('--force-with-lease')
  if (opts.setUpstream) args.push('--set-upstream', 'origin', opts.setUpstream)
  const result = await execGit({
    cwd: repoPath,
    args,
    signal: opts.signal,
    onStderr: opts.onProgress
      ? (chunk): void => {
          for (const e of parseProgressChunk(chunk)) opts.onProgress?.(e)
        }
      : undefined
  })
  if (result.code !== 0) {
    throw new Error(`git push failed (${result.code}): ${result.stderr.trim()}`)
  }
}

export async function isRepo(repoPath: string): Promise<boolean> {
  const result = await execGit({ cwd: repoPath, args: ['rev-parse', '--is-inside-work-tree'] })
  return result.code === 0 && result.stdout.trim() === 'true'
}

export interface StashInfo {
  oid: string
  ref: string
  subject: string
  time: number
}

const STASH_FORMAT = '%H%x00%gd%x00%s%x00%ct'

export async function listStashes(repoPath: string): Promise<StashInfo[]> {
  const result = await execGit({ cwd: repoPath, args: ['stash', 'list', `--format=${STASH_FORMAT}`] })
  if (result.code !== 0) return []
  const stashes: StashInfo[] = []
  for (const line of result.stdout.split('\n')) {
    if (!line.trim()) continue
    const f = line.split('\x00')
    if (f.length < 4) continue
    stashes.push({ oid: f[0], ref: f[1], subject: f[2], time: Number(f[3]) })
  }
  return stashes
}

export interface SubmoduleInfo {
  path: string
  oid: string
  /** '+' new commits, '-' not initialized, 'U' merge conflicts, ' ' up to date */
  status: string
}

export async function listSubmodules(repoPath: string): Promise<SubmoduleInfo[]> {
  const result = await execGit({ cwd: repoPath, args: ['submodule', 'status'] })
  if (result.code !== 0) return []
  const subs: SubmoduleInfo[] = []
  for (const line of result.stdout.split('\n')) {
    if (!line.trim()) continue
    const m = /^([+\-U ])([0-9a-f]{7,40})\s+(.+?)\s*(?:\(.*)?$/.exec(line)
    if (m) subs.push({ status: m[1], oid: m[2], path: m[3] })
  }
  return subs
}
