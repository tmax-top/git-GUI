import { createHash, randomUUID } from 'node:crypto'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execGit, execGitOrThrow } from './exec'
import { repoQueue } from './queue'

export interface UndoDescription {
  key: string
  params?: Record<string, string | number>
}

/**
 * Point-in-time repo snapshot backing the undo stack.
 *
 * - `refs`: refs/heads + refs/tags + refs/stash → oid
 * - `indexTree`: `git write-tree` of the real index (null when unmerged)
 * - `worktreeTree`: full worktree content (tracked + untracked, gitignore-
 *   respecting) captured through a throwaway index; equals `indexTree` when
 *   the worktree was clean
 * - `fingerprint`: detects drift between capture and apply
 */
export interface UndoSnapshot {
  head: string | null
  headRef: string | null
  headTree: string | null
  refs: Record<string, string>
  indexTree: string | null
  /**
   * Full worktree content tree. Null when the op is index-only (stage,
   * commit, …) — restore then leaves the worktree untouched.
   */
  worktreeTree: string | null
  fingerprint: string
}

export interface CaptureOptions {
  /**
   * Capture the worktree content too (needed for ops that rewrite files:
   * checkout/merge/rebase/reset --hard/stash/pull). Default true.
   */
  worktree?: boolean
}

export interface UndoEntry {
  id: string
  description: UndoDescription
  before: UndoSnapshot
  after: UndoSnapshot
}

export interface UndoStackState {
  canUndo: boolean
  canRedo: boolean
  undoLabel?: UndoDescription
  redoLabel?: UndoDescription
}

export interface UndoApplyResult {
  applied: boolean
  empty?: boolean
  currentChanged?: boolean
  forcePushRisk?: string[]
  description?: UndoDescription
}

const UNDO_LIMIT = 50
const TMP_BRANCH = 'refs/heads/__gitgui_undo_tmp'

interface RepoStacks {
  undo: UndoEntry[]
  redo: UndoEntry[]
}

const stacks = new Map<string, RepoStacks>()

function stacksFor(repoPath: string): RepoStacks {
  let s = stacks.get(repoPath)
  if (!s) {
    s = { undo: [], redo: [] }
    stacks.set(repoPath, s)
  }
  return s
}

/** Test hook — wipe all per-repo stacks. */
export function clearUndoStacks(): void {
  stacks.clear()
}

/** Test hook — current undo/redo entry counts for a repo. */
export function undoDepth(repoPath: string): { undo: number; redo: number } {
  const s = stacksFor(repoPath)
  return { undo: s.undo.length, redo: s.redo.length }
}

export function undoList(repoPath: string): UndoStackState {
  const s = stacksFor(repoPath)
  const top = s.undo[s.undo.length - 1]
  const topRedo = s.redo[s.redo.length - 1]
  return {
    canUndo: s.undo.length > 0,
    canRedo: s.redo.length > 0,
    undoLabel: top?.description,
    redoLabel: topRedo?.description
  }
}

export async function captureUndoSnapshot(
  repoPath: string,
  opts: CaptureOptions = {}
): Promise<UndoSnapshot> {
  const captureWorktree = opts.worktree ?? true
  const headRes = await execGit({ cwd: repoPath, args: ['rev-parse', '--verify', 'HEAD'] })
  const head = headRes.code === 0 ? headRes.stdout.trim() : null

  const headRefRes = await execGit({ cwd: repoPath, args: ['symbolic-ref', '-q', 'HEAD'] })
  const headRef = headRefRes.code === 0 ? headRefRes.stdout.trim() : null

  let headTree: string | null = null
  if (head) {
    const treeRes = await execGit({ cwd: repoPath, args: ['rev-parse', `${head}^{tree}`] })
    headTree = treeRes.code === 0 ? treeRes.stdout.trim() : null
  }

  const refsRes = await execGitOrThrow({
    cwd: repoPath,
    // Literal tab separator — git's for-each-ref --format does not expand
    // %x09 (unlike pretty-format), so a raw tab is used instead.
    args: ['for-each-ref', '--format=%(refname)\t%(objectname)', 'refs/heads', 'refs/tags', 'refs/stash']
  })
  const refs: Record<string, string> = {}
  for (const line of refsRes.stdout.split('\n')) {
    if (!line) continue
    const i = line.indexOf('\t')
    if (i > 0) refs[line.slice(0, i)] = line.slice(i + 1)
  }

  // Null on an unmerged index — restoring skips the index then.
  const indexRes = await execGit({ cwd: repoPath, args: ['write-tree'] })
  const indexTree = indexRes.code === 0 ? indexRes.stdout.trim() : null

  let worktreeTree: string | null = null
  if (captureWorktree) {
    const statusRes = await execGit({ cwd: repoPath, args: ['status', '--porcelain'] })
    const dirty = statusRes.code === 0 && statusRes.stdout.trim().length > 0
    if (!dirty) {
      worktreeTree = indexTree ?? headTree
    } else {
      // Throwaway index: `add -A` stages every non-ignored worktree file into a
      // scratch index whose tree is the exact worktree content.
      const tmpIndex = join(tmpdir(), `gitgui-undo-${process.pid}-${randomUUID()}`)
      try {
        await execGitOrThrow({ cwd: repoPath, args: ['add', '-A'], env: { GIT_INDEX_FILE: tmpIndex } })
        const wt = await execGitOrThrow({ cwd: repoPath, args: ['write-tree'], env: { GIT_INDEX_FILE: tmpIndex } })
        worktreeTree = wt.stdout.trim()
      } catch {
        worktreeTree = null
      } finally {
        await rm(tmpIndex, { force: true }).catch(() => undefined)
      }
    }
  }

  const fingerprint = createHash('sha256')
    .update(JSON.stringify([head, headRef, Object.entries(refs).sort(), indexTree, worktreeTree]))
    .digest('hex')

  return { head, headRef, headTree, refs, indexTree, worktreeTree, fingerprint }
}

/** Rewrite refs + HEAD + index + worktree back to `snap`. Runs serialized. */
export async function restoreUndoSnapshot(repoPath: string, snap: UndoSnapshot): Promise<void> {
  return repoQueue.run(repoPath, async () => {
    const curRes = await execGitOrThrow({
      cwd: repoPath,
      args: ['for-each-ref', '--format=%(refname)', 'refs/heads', 'refs/tags', 'refs/stash']
    })
    const currentRefs = curRes.stdout.split('\n').filter(Boolean)

    if (snap.head === null) {
      // Unborn target: park HEAD on a throwaway unborn ref so real branches
      // become deletable, then point back at the snapshot's (unborn) branch.
      await execGitOrThrow({ cwd: repoPath, args: ['symbolic-ref', 'HEAD', TMP_BRANCH] })
    } else {
      // Detach first so the currently-checked-out branch can be moved/deleted.
      await execGitOrThrow({ cwd: repoPath, args: ['update-ref', '--no-deref', 'HEAD', snap.head] })
    }

    for (const ref of currentRefs) {
      if (!(ref in snap.refs)) await execGitOrThrow({ cwd: repoPath, args: ['update-ref', '-d', ref] })
    }
    for (const [ref, oid] of Object.entries(snap.refs)) {
      await execGitOrThrow({ cwd: repoPath, args: ['update-ref', ref, oid] })
    }

    if (snap.headRef) {
      await execGitOrThrow({ cwd: repoPath, args: ['symbolic-ref', 'HEAD', snap.headRef] })
    }

    // Worktree first (resets index too), then narrow the index to the staged
    // snapshot — restoring the staged/unstaged split without touching files.
    if (snap.worktreeTree) {
      await execGitOrThrow({ cwd: repoPath, args: ['read-tree', '--reset', '-u', snap.worktreeTree] })
    }
    if (snap.indexTree) {
      await execGitOrThrow({ cwd: repoPath, args: ['read-tree', snap.indexTree] })
    }
  })
}

/**
 * Branches in `target` whose upstream contains commits the restored oid lacks
 * — pushing after restore would need a force push.
 */
async function detectForcePushRisk(repoPath: string, target: UndoSnapshot): Promise<string[]> {
  const risks: string[] = []
  for (const [ref, oid] of Object.entries(target.refs)) {
    if (!ref.startsWith('refs/heads/')) continue
    const branch = ref.slice('refs/heads/'.length)
    const up = await execGit({ cwd: repoPath, args: ['rev-parse', '--verify', '--quiet', `${branch}@{upstream}`] })
    if (up.code !== 0) continue
    const upOid = up.stdout.trim()
    if (!upOid || upOid === oid) continue
    const anc = await execGit({ cwd: repoPath, args: ['merge-base', '--is-ancestor', upOid, oid] })
    if (anc.code !== 0) risks.push(branch)
  }
  return risks
}

/**
 * Push a completed mutation onto the undo stack. A no-op (identical
 * fingerprints) is not recorded; a new entry clears the redo stack.
 */
export function recordUndoEntry(
  repoPath: string,
  description: UndoDescription,
  before: UndoSnapshot,
  after: UndoSnapshot
): UndoStackState {
  const s = stacksFor(repoPath)
  if (before.fingerprint !== after.fingerprint) {
    s.undo.push({ id: randomUUID(), description, before, after })
    if (s.undo.length > UNDO_LIMIT) s.undo.splice(0, s.undo.length - UNDO_LIMIT)
    s.redo.length = 0
  }
  return undoList(repoPath)
}

/**
 * Undo (pop undo → push redo) or redo (pop redo → push undo) the top entry.
 * Without `force`, refuses when the repo drifted from the recorded end state
 * or when a restored branch's upstream advanced (force-push risk).
 */
export async function applyUndo(
  repoPath: string,
  direction: 'undo' | 'redo',
  force = false
): Promise<UndoApplyResult> {
  const s = stacksFor(repoPath)
  const from = direction === 'undo' ? s.undo : s.redo
  const to = direction === 'undo' ? s.redo : s.undo
  const entry = from[from.length - 1]
  if (!entry) return { applied: false, empty: true }

  const target = direction === 'undo' ? entry.before : entry.after
  const expected = direction === 'undo' ? entry.after : entry.before

  // Compare like-for-like: an index-only snapshot (worktreeTree null) must not
  // be diffed against a worktree-inclusive capture.
  const current = await captureUndoSnapshot(repoPath, { worktree: expected.worktreeTree !== null })
  const currentChanged = current.fingerprint !== expected.fingerprint
  const forcePushRisk = await detectForcePushRisk(repoPath, target)
  if ((currentChanged || forcePushRisk.length > 0) && !force) {
    return { applied: false, currentChanged, forcePushRisk, description: entry.description }
  }

  await restoreUndoSnapshot(repoPath, target)
  from.pop()
  to.push(entry)
  return { applied: true, forcePushRisk, description: entry.description }
}
