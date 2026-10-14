import { execGitOrThrow } from './exec'

export interface CommitInfo {
  oid: string
  shortOid: string
  authorName: string
  authorEmail: string
  authorTime: number
  committerName: string
  committerEmail: string
  committerTime: number
  parents: string[]
  subject: string
  body: string
}

const RECORD_SEP = '\x01'

// NUL cannot be embedded in argv; use git pretty-format %xNN escapes instead.
const LOG_FORMAT = [
  '%H',
  '%h',
  '%an',
  '%ae',
  '%at',
  '%cn',
  '%ce',
  '%ct',
  '%P',
  '%s',
  '%b'
].join('%x00')

export function parseLogOutput(output: string): CommitInfo[] {
  const commits: CommitInfo[] = []
  for (const record of output.split(RECORD_SEP)) {
    const rec = record.replace(/^\n+|\n+$/g, '')
    if (!rec) continue
    const f = rec.split('\x00')
    if (f.length < 11) continue
    commits.push({
      oid: f[0],
      shortOid: f[1],
      authorName: f[2],
      authorEmail: f[3],
      authorTime: Number(f[4]),
      committerName: f[5],
      committerEmail: f[6],
      committerTime: Number(f[7]),
      parents: f[8] ? f[8].split(' ') : [],
      subject: f[9],
      body: f[10]
    })
  }
  return commits
}

export interface LogOptions {
  limit?: number
  skip?: number
  all?: boolean
  paths?: string[]
  grep?: string
  /** Parent-before-children ordering — required for stable graph drawing. */
  topo?: boolean
  signal?: AbortSignal
}

export async function getLog(repoPath: string, opts: LogOptions = {}): Promise<CommitInfo[]> {
  const args = ['log', `--format=${RECORD_SEP}${LOG_FORMAT}${RECORD_SEP}`]
  if (opts.all !== false) args.push('--all')
  if (opts.topo) args.push('--topo-order')
  if (opts.limit != null) args.push(`-n`, String(opts.limit))
  if (opts.skip != null) args.push(`--skip=${opts.skip}`)
  if (opts.grep) args.push(`--grep=${opts.grep}`, '--fixed-strings')
  if (opts.paths && opts.paths.length > 0) {
    args.push('--', ...opts.paths)
  }
  const { stdout } = await execGitOrThrow({ cwd: repoPath, args, signal: opts.signal })
  return parseLogOutput(stdout)
}
