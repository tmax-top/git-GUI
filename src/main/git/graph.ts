import { execGitOrThrow } from './exec'

export interface GraphCommit {
  oid: string
  parents: string[]
}

export function parseRevListParents(output: string): GraphCommit[] {
  const commits: GraphCommit[] = []
  for (const line of output.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const parts = trimmed.split(' ')
    commits.push({ oid: parts[0], parents: parts.slice(1) })
  }
  return commits
}

export interface RevListOptions {
  limit?: number
  skip?: number
  all?: boolean
  signal?: AbortSignal
}

export async function revList(repoPath: string, opts: RevListOptions = {}): Promise<GraphCommit[]> {
  const args = ['rev-list', '--topo-order', '--parents']
  if (opts.all !== false) {
    // Keep agent-tooling snapshot refs out of the graph (see log.ts).
    args.push('--exclude=refs/agents/*', '--all')
  }
  if (opts.limit != null) args.push('-n', String(opts.limit))
  if (opts.skip != null) args.push(`--skip=${opts.skip}`)
  const { stdout } = await execGitOrThrow({ cwd: repoPath, args, signal: opts.signal })
  return parseRevListParents(stdout)
}
