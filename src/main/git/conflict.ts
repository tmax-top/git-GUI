import { readFile, writeFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { execGitOrThrow, GitExecError } from './exec'
import { repoQueue } from './queue'
import { getStatus } from './status'

/** Three index stages of a conflicted (unmerged) file, plus worktree text. */
export interface ConflictFile {
  path: string
  /** Stage 1 — common ancestor. Null for add/add or delete/modify conflicts. */
  base: string | null
  /** Stage 2 — ours (current branch / HEAD). Null when our side deleted. */
  ours: string | null
  /** Stage 3 — theirs (incoming). Null when their side deleted. */
  theirs: string | null
  /** Worktree content (contains conflict markers) — what the user edits. */
  worktree: string
  /** True when any stage or the worktree file is binary. */
  binary: boolean
}

interface StageRead {
  text: string | null
  exists: boolean
  binary: boolean
}

/** Read one index stage (`:1:`, `:2:`, `:3:`); absent stages resolve to exists:false. */
async function readStage(repoPath: string, stage: number, path: string): Promise<StageRead> {
  try {
    const { stdoutBuf } = await execGitOrThrow({
      cwd: repoPath,
      args: ['show', `:${stage}:${path}`],
      binary: true
    })
    const buf = stdoutBuf ?? Buffer.alloc(0)
    // A NUL byte means binary content — the editor falls back to side pickers.
    if (buf.includes(0)) return { text: null, exists: true, binary: true }
    return { text: buf.toString('utf8'), exists: true, binary: false }
  } catch (e) {
    if (e instanceof GitExecError) return { text: null, exists: false, binary: false }
    throw e
  }
}

/** Read a conflicted file's three stages + worktree content for the editor. */
export async function getConflictFile(repoPath: string, path: string): Promise<ConflictFile> {
  const status = await getStatus(repoPath)
  const file = status.files.find((f) => f.path === path)
  if (!file || file.unmerged !== true) {
    throw new Error(`not a conflicted file: ${path}`)
  }

  const [b, o, t] = await Promise.all([
    readStage(repoPath, 1, path),
    readStage(repoPath, 2, path),
    readStage(repoPath, 3, path)
  ])
  let binary = b.binary || o.binary || t.binary

  // The worktree file is where the markers live — read it from disk.
  let worktree: string
  try {
    const abs = isAbsolute(path) ? path : join(repoPath, path)
    const raw = await readFile(abs)
    if (raw.includes(0)) {
      binary = true
      worktree = ''
    } else {
      worktree = raw.toString('utf8')
    }
  } catch {
    // File deleted on our side (delete/modify conflict) — no worktree content.
    worktree = ''
  }

  return {
    path,
    base: b.exists ? b.text : null,
    ours: o.exists ? o.text : null,
    theirs: t.exists ? t.text : null,
    worktree,
    binary
  }
}

/** Write the user's resolved content over the worktree file and stage it. */
export async function resolveConflict(repoPath: string, path: string, content: string): Promise<void> {
  await repoQueue.run(repoPath, async () => {
    const abs = isAbsolute(path) ? path : join(repoPath, path)
    await writeFile(abs, content, 'utf8')
    await execGitOrThrow({ cwd: repoPath, args: ['add', '--', path] })
  })
}

/**
 * Accept one side wholesale: `git checkout --ours/--theirs -- <path>` writes the
 * chosen stage over the worktree (binary-safe), then stages it.
 */
export async function acceptConflictSide(
  repoPath: string,
  path: string,
  side: 'ours' | 'theirs'
): Promise<void> {
  await repoQueue.run(repoPath, async () => {
    await execGitOrThrow({ cwd: repoPath, args: ['checkout', `--${side}`, '--', path] })
    await execGitOrThrow({ cwd: repoPath, args: ['add', '--', path] })
  })
}
