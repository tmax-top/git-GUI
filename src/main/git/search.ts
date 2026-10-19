import { execGit, execGitOrThrow, GitExecError } from './exec'
import { getLog, type CommitInfo } from './log'

export interface SearchCommitHit {
  oid: string
  shortOid: string
  subject: string
  authorName: string
  authorTime: number
}

export interface SearchContentHit {
  path: string
  line: number
  text: string
}

export interface SearchLimits {
  commits?: number
  files?: number
  content?: number
}

const DEFAULT_LIMITS: Required<SearchLimits> = { commits: 100, files: 200, content: 100 }

/** Commit-message search — literal, case-insensitive substring over all refs. */
export async function searchCommits(
  repoPath: string,
  query: string,
  limit = DEFAULT_LIMITS.commits
): Promise<SearchCommitHit[]> {
  const commits: CommitInfo[] = await getLog(repoPath, {
    grep: query,
    ignoreCase: true,
    limit
  })
  return commits.map((c) => ({
    oid: c.oid,
    shortOid: c.shortOid,
    subject: c.subject,
    authorName: c.authorName,
    authorTime: c.authorTime
  }))
}

/** File-path search over tracked + untracked (non-ignored) files. */
export async function searchFiles(
  repoPath: string,
  query: string,
  limit = DEFAULT_LIMITS.files
): Promise<string[]> {
  const { stdout } = await execGitOrThrow({
    cwd: repoPath,
    args: ['ls-files', '-z', '--cached', '--others', '--exclude-standard']
  })
  const needle = query.toLowerCase()
  const hits: string[] = []
  for (const raw of stdout.split('\0')) {
    if (!raw) continue
    if (raw.toLowerCase().includes(needle)) {
      hits.push(raw)
      if (hits.length >= limit) break
    }
  }
  return hits
}

/**
 * Working-tree content search (`git grep`), literal pattern, skips binaries.
 * Exit code 1 (no match) is not an error.
 */
export async function searchContent(
  repoPath: string,
  query: string,
  limit = DEFAULT_LIMITS.content
): Promise<SearchContentHit[]> {
  const { code, stdout, stderr } = await execGit({
    cwd: repoPath,
    args: ['grep', '-z', '-n', '-I', '-F', '-e', query, '--untracked'],
    timeoutMs: 15_000
  })
  if (code === 1) return []
  if (code !== 0) {
    throw new GitExecError({ code, stdout, stderr }, ['grep'])
  }
  const hits: SearchContentHit[] = []
  for (const record of stdout.split('\n')) {
    if (!record) continue
    const sep = record.indexOf('\0')
    if (sep < 0) continue
    const path = record.slice(0, sep)
    const rest = record.slice(sep + 1)
    const sep2 = rest.indexOf('\0')
    if (sep2 < 0) continue
    const line = Number(rest.slice(0, sep2))
    const text = rest.slice(sep2 + 1)
    if (!Number.isFinite(line)) continue
    hits.push({ path, line, text })
    if (hits.length >= limit) break
  }
  return hits
}
