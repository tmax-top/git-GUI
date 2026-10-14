import { chmod, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { tmpdir } from 'node:os'
import { execGit, execGitOrThrow, GitExecError } from './exec'
import { repoQueue } from './queue'
import { getStatus } from './status'

// ---------------------------------------------------------------------------
// Interrupted-operation state (merge / rebase / cherry-pick / revert)
// ---------------------------------------------------------------------------

export type OpKind = 'merge' | 'rebase' | 'cherry-pick' | 'revert'

export interface OpState {
  kind: OpKind | null
  conflicts: string[]
  /** 1-based step during an interactive rebase, when known. */
  rebaseCurrent?: number
  rebaseTotal?: number
}

async function gitDir(repoPath: string): Promise<string> {
  const { stdout } = await execGitOrThrow({ cwd: repoPath, args: ['rev-parse', '--git-dir'] })
  const dir = stdout.trim()
  return isAbsolute(dir) ? dir : join(repoPath, dir)
}

async function exists(path: string): Promise<boolean> {
  try {
    await readdir(path)
    return true
  } catch {
    try {
      const { readFile: rf } = await import('node:fs/promises')
      await rf(path)
      return true
    } catch {
      return false
    }
  }
}

async function conflictPaths(repoPath: string): Promise<string[]> {
  const status = await getStatus(repoPath)
  return status.files.filter((f) => f.unmerged === true).map((f) => f.path)
}

async function detectKind(gitDir: string): Promise<OpKind | null> {
  if (await exists(join(gitDir, 'rebase-merge'))) return 'rebase'
  if (await exists(join(gitDir, 'rebase-apply'))) return 'rebase'
  if (await exists(join(gitDir, 'MERGE_HEAD'))) return 'merge'
  if (await exists(join(gitDir, 'CHERRY_PICK_HEAD'))) return 'cherry-pick'
  if (await exists(join(gitDir, 'REVERT_HEAD'))) return 'revert'
  return null
}

/** Detect an in-progress merge/rebase/cherry-pick/revert plus conflict paths. */
export async function getOpState(repoPath: string): Promise<OpState> {
  const dir = await gitDir(repoPath)
  const kind = await detectKind(dir)
  const state: OpState = { kind, conflicts: await conflictPaths(repoPath) }
  if (kind === 'rebase') {
    // Interactive rebase counters live in rebase-merge/ (msgnum/end),
    // am-style in rebase-apply/ (next/last).
    try {
      const mergeDir = join(dir, 'rebase-merge')
      const current = Number(await readFile(join(mergeDir, 'msgnum'), 'utf8'))
      const total = Number(await readFile(join(mergeDir, 'end'), 'utf8'))
      if (Number.isFinite(current) && Number.isFinite(total)) {
        state.rebaseCurrent = current
        state.rebaseTotal = total
      }
    } catch {
      try {
        const applyDir = join(dir, 'rebase-apply')
        const current = Number(await readFile(join(applyDir, 'next'), 'utf8'))
        const total = Number(await readFile(join(applyDir, 'last'), 'utf8'))
        if (Number.isFinite(current) && Number.isFinite(total)) {
          state.rebaseCurrent = current
          state.rebaseTotal = total
        }
      } catch {
        /* counters are best-effort */
      }
    }
  }
  return state
}

function assertBranchName(name: string): void {
  if (!name || name.startsWith('-') || name.includes('..')) {
    throw new Error(`invalid ref: ${name}`)
  }
}

/**
 * Run a history-mutating command. On failure: if conflicts were produced,
 * return them (state left in-progress for continue/abort); otherwise throw.
 */
async function runMaybeConflicted(
  repoPath: string,
  args: string[],
  conflicted: () => Promise<string[]>,
  env?: Record<string, string>
): Promise<{ conflicts: string[] }> {
  const result = await execGit({ cwd: repoPath, args, env })
  if (result.code === 0) return { conflicts: [] }
  const conflicts = await conflicted()
  if (conflicts.length > 0) return { conflicts }
  throw new GitExecError(result, args)
}

// ---------------------------------------------------------------------------
// merge / cherry-pick / revert / reset
// ---------------------------------------------------------------------------

export interface MergeOptions {
  noFF?: boolean
  ffOnly?: boolean
  message?: string
}

export async function merge(
  repoPath: string,
  branch: string,
  opts: MergeOptions = {}
): Promise<{ conflicts: string[] }> {
  assertBranchName(branch)
  return repoQueue.run(repoPath, () => {
    const args = ['merge', '--no-edit']
    if (opts.ffOnly) args.push('--ff-only')
    if (opts.noFF) args.push('--no-ff')
    if (opts.message) args.push('-m', opts.message)
    args.push(branch)
    return runMaybeConflicted(repoPath, args, () => conflictPaths(repoPath))
  })
}

export interface CherryPickOptions {
  /** Parent (1 or 2) for merges. */
  mainline?: number
}

export async function cherryPick(
  repoPath: string,
  oids: string[],
  opts: CherryPickOptions = {}
): Promise<{ conflicts: string[] }> {
  if (oids.length === 0) throw new Error('cherry-pick requires at least one commit')
  return repoQueue.run(repoPath, () => {
    const args = ['cherry-pick']
    if (opts.mainline != null) args.push('-m', String(opts.mainline))
    args.push(...oids)
    return runMaybeConflicted(repoPath, args, () => conflictPaths(repoPath))
  })
}

export async function revertCommits(
  repoPath: string,
  oids: string[],
  opts: CherryPickOptions = {}
): Promise<{ conflicts: string[] }> {
  if (oids.length === 0) throw new Error('revert requires at least one commit')
  return repoQueue.run(repoPath, () => {
    const args = ['revert', '--no-edit']
    if (opts.mainline != null) args.push('-m', String(opts.mainline))
    args.push(...oids)
    return runMaybeConflicted(repoPath, args, () => conflictPaths(repoPath))
  })
}

export type ResetMode = 'soft' | 'mixed' | 'hard'

export async function reset(repoPath: string, mode: ResetMode, target: string): Promise<void> {
  assertBranchName(target)
  if (mode !== 'soft' && mode !== 'mixed' && mode !== 'hard') {
    throw new Error(`invalid reset mode: ${mode}`)
  }
  await repoQueue.run(repoPath, () =>
    execGitOrThrow({ cwd: repoPath, args: ['reset', `--${mode}`, target] })
  )
}

// ---------------------------------------------------------------------------
// in-progress operation control
// ---------------------------------------------------------------------------

export async function abortOp(repoPath: string): Promise<void> {
  await repoQueue.run(repoPath, async () => {
    const state = await getOpState(repoPath)
    if (!state.kind) throw new Error('no operation in progress')
    await execGitOrThrow({ cwd: repoPath, args: [state.kind, '--abort'] })
  })
}

export async function continueOp(repoPath: string): Promise<{ conflicts: string[] }> {
  return repoQueue.run(repoPath, async () => {
    const state = await getOpState(repoPath)
    if (!state.kind) throw new Error('no operation in progress')
    // Never open an editor from the GUI — the message git already prepared wins.
    return runMaybeConflicted(repoPath, [state.kind, '--continue'], () => conflictPaths(repoPath), {
      GIT_EDITOR: 'true'
    })
  })
}

export async function skipOp(repoPath: string): Promise<{ conflicts: string[] }> {
  return repoQueue.run(repoPath, async () => {
    const state = await getOpState(repoPath)
    if (state.kind !== 'rebase' && state.kind !== 'cherry-pick') {
      throw new Error('skip is only available during rebase or cherry-pick')
    }
    return runMaybeConflicted(repoPath, [state.kind, '--skip'], () => conflictPaths(repoPath))
  })
}

// ---------------------------------------------------------------------------
// rebase
// ---------------------------------------------------------------------------

export async function rebase(
  repoPath: string,
  upstream: string,
  opts: { autostash?: boolean } = {}
): Promise<{ conflicts: string[] }> {
  assertBranchName(upstream)
  return repoQueue.run(repoPath, () => {
    const args = ['rebase']
    if (opts.autostash) args.push('--autostash')
    args.push(upstream)
    return runMaybeConflicted(repoPath, args, () => conflictPaths(repoPath))
  })
}

export type RebaseAction = 'pick' | 'reword' | 'squash' | 'fixup' | 'drop'

export interface RebaseOp {
  oid: string
  action: RebaseAction
  /** New message — used by `reword` (and ignored for pick/squash/fixup/drop). */
  message?: string
}

const REBASE_ACTIONS: ReadonlySet<string> = new Set(['pick', 'reword', 'squash', 'fixup', 'drop'])

/**
 * Non-interactive interactive-rebase: we drive `git rebase -i` with a
 * GIT_SEQUENCE_EDITOR that writes our own todo list (reorder, squash, drop,
 * reword without ever opening an editor).
 */
export async function rebaseInteractive(
  repoPath: string,
  upstream: string,
  ops: RebaseOp[],
  opts: { autostash?: boolean } = {}
): Promise<{ conflicts: string[] }> {
  assertBranchName(upstream)
  if (ops.length === 0) throw new Error('rebase plan is empty')
  for (const op of ops) {
    if (!/^[0-9a-f]{7,40}$/.test(op.oid)) throw new Error(`invalid oid in rebase plan: ${op.oid}`)
    if (!REBASE_ACTIONS.has(op.action)) throw new Error(`invalid rebase action: ${op.action}`)
  }

  const todo =
    ops
      .map((op) => `${op.action} ${op.oid}${op.message && op.action === 'reword' ? ` ${op.message.replace(/\n+/g, ' ')}` : ''}`)
      .join('\n') + '\n'

  const seqScript = join(tmpdir(), `gitgui-seq-${Date.now()}-${Math.random().toString(36).slice(2)}.sh`)
  await writeFile(
    seqScript,
    `#!/bin/sh\ncat > "$1" <<'GITGUI_TODO'\n${todo}GITGUI_TODO\n`,
    'utf8'
  )
  await chmod(seqScript, 0o755)

  // reword messages are delivered by a queue-consuming editor script
  const rewordMsgs = ops.filter((o) => o.action === 'reword' && o.message).map((o) => o.message!)
  const env: Record<string, string> = { GIT_SEQUENCE_EDITOR: seqScript }
  let editorScript: string | null = null
  let queueFile: string | null = null
  if (rewordMsgs.length > 0) {
    queueFile = join(tmpdir(), `gitgui-msgs-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`)
    await writeFile(queueFile, rewordMsgs.join('\n') + '\n', 'utf8')
    editorScript = join(tmpdir(), `gitgui-edit-${Date.now()}-${Math.random().toString(36).slice(2)}.sh`)
    await writeFile(
      editorScript,
      `#!/bin/sh
msg=$(head -n 1 "${queueFile}")
if [ -n "$msg" ]; then
  printf '%s\\n' "$msg" > "$1"
  tail -n +2 "${queueFile}" > "${queueFile}.tmp" && mv "${queueFile}.tmp" "${queueFile}"
fi
`,
      'utf8'
    )
    await chmod(editorScript, 0o755)
    env.GIT_EDITOR = editorScript
  }

  try {
    return await repoQueue.run(repoPath, () => {
      const args = ['rebase', '-i']
      if (opts.autostash) args.push('--autostash')
      args.push(upstream)
      return runMaybeConflicted(repoPath, args, () => conflictPaths(repoPath), env)
    })
  } finally {
    await rm(seqScript, { force: true })
    if (editorScript) await rm(editorScript, { force: true })
    if (queueFile) await rm(queueFile, { force: true })
  }
}

// ---------------------------------------------------------------------------
// stash
// ---------------------------------------------------------------------------

export interface StashPushOptions {
  message?: string
  untracked?: boolean
  /** Only stash staged changes (index), leaving worktree intact. */
  staged?: boolean
}

export async function stashPush(repoPath: string, opts: StashPushOptions = {}): Promise<void> {
  await repoQueue.run(repoPath, () => {
    const args = ['stash', 'push']
    if (opts.untracked) args.push('-u')
    if (opts.staged) args.push('--staged')
    if (opts.message) args.push('-m', opts.message)
    return execGitOrThrow({ cwd: repoPath, args })
  })
}

export async function stashApply(
  repoPath: string,
  ref: string | undefined,
  opts: { pop?: boolean } = {}
): Promise<{ conflicts: string[] }> {
  if (ref) assertBranchName(ref)
  return repoQueue.run(repoPath, () => {
    const args = ['stash', opts.pop ? 'pop' : 'apply']
    if (ref) args.push(ref)
    return runMaybeConflicted(repoPath, args, () => conflictPaths(repoPath))
  })
}

export async function stashDrop(repoPath: string, ref?: string): Promise<void> {
  if (ref) assertBranchName(ref)
  await repoQueue.run(repoPath, () => {
    const args = ['stash', 'drop']
    if (ref) args.push(ref)
    return execGitOrThrow({ cwd: repoPath, args })
  })
}

// ---------------------------------------------------------------------------
// tags
// ---------------------------------------------------------------------------

export async function tagCreate(
  repoPath: string,
  name: string,
  opts: { message?: string; oid?: string } = {}
): Promise<void> {
  assertBranchName(name)
  if (opts.oid) assertBranchName(opts.oid)
  await repoQueue.run(repoPath, () => {
    const args = opts.message ? ['tag', '-a', name, '-m', opts.message] : ['tag', name]
    if (opts.oid) args.push(opts.oid)
    return execGitOrThrow({ cwd: repoPath, args })
  })
}

export async function tagDelete(repoPath: string, names: string[]): Promise<void> {
  if (names.length === 0) throw new Error('no tags to delete')
  for (const n of names) assertBranchName(n)
  await repoQueue.run(repoPath, () =>
    execGitOrThrow({ cwd: repoPath, args: ['tag', '-d', ...names] })
  )
}

// ---------------------------------------------------------------------------
// branches
// ---------------------------------------------------------------------------

export async function deleteBranch(repoPath: string, name: string, force = false): Promise<void> {
  assertBranchName(name)
  await repoQueue.run(repoPath, () =>
    execGitOrThrow({ cwd: repoPath, args: ['branch', force ? '-D' : '-d', name] })
  )
}

export async function renameBranch(repoPath: string, from: string, to: string): Promise<void> {
  assertBranchName(from)
  assertBranchName(to)
  await repoQueue.run(repoPath, () =>
    execGitOrThrow({ cwd: repoPath, args: ['branch', '-m', from, to] })
  )
}

// ---------------------------------------------------------------------------
// worktrees
// ---------------------------------------------------------------------------

export interface WorktreeInfo {
  path: string
  head?: string
  branch?: string
  bare?: boolean
  detached?: boolean
  locked?: boolean
  prunable?: boolean
}

export async function listWorktrees(repoPath: string): Promise<WorktreeInfo[]> {
  const { stdout } = await execGitOrThrow({ cwd: repoPath, args: ['worktree', 'list', '--porcelain'] })
  const out: WorktreeInfo[] = []
  let cur: WorktreeInfo | null = null
  for (const line of stdout.split('\n')) {
    if (line.startsWith('worktree ')) {
      cur = { path: line.slice(9) }
      out.push(cur)
    } else if (!cur) {
      continue
    } else if (line.startsWith('HEAD ')) {
      cur.head = line.slice(5)
    } else if (line.startsWith('branch ')) {
      cur.branch = line.slice(7).replace(/^refs\/heads\//, '')
    } else if (line === 'bare') {
      cur.bare = true
    } else if (line === 'detached') {
      cur.detached = true
    } else if (line.startsWith('locked')) {
      cur.locked = true
    } else if (line.startsWith('prunable')) {
      cur.prunable = true
    }
  }
  return out
}

export async function addWorktree(
  repoPath: string,
  path: string,
  opts: { branch?: string; startPoint?: string } = {}
): Promise<void> {
  await repoQueue.run(repoPath, () => {
    const args = ['worktree', 'add']
    if (opts.branch) {
      assertBranchName(opts.branch)
      args.push('-b', opts.branch, path)
      if (opts.startPoint) args.push(opts.startPoint)
    } else {
      args.push(path)
      if (opts.startPoint) {
        assertBranchName(opts.startPoint)
        args.push(opts.startPoint)
      }
    }
    return execGitOrThrow({ cwd: repoPath, args })
  })
}

export async function removeWorktree(repoPath: string, path: string, force = false): Promise<void> {
  await repoQueue.run(repoPath, () => {
    const args = ['worktree', 'remove', path]
    if (force) args.push('--force')
    return execGitOrThrow({ cwd: repoPath, args })
  })
}

export async function pruneWorktrees(repoPath: string): Promise<void> {
  await repoQueue.run(repoPath, () => execGitOrThrow({ cwd: repoPath, args: ['worktree', 'prune'] }))
}
