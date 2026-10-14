import { execGitOrThrow } from './exec'
import type { GitStatusDto } from '../../shared/ipc'

export function parsePorcelainV2(output: string): GitStatusDto {
  const status: GitStatusDto = {
    ahead: 0,
    behind: 0,
    detached: false,
    files: []
  }

  for (const line of output.split('\n')) {
    if (!line) continue

    if (line.startsWith('# branch.oid ')) {
      status.oid = line.slice('# branch.oid '.length).trim()
    } else if (line.startsWith('# branch.head ')) {
      const head = line.slice('# branch.head '.length).trim()
      if (head === '(detached)') {
        status.detached = true
        status.head = status.oid
      } else {
        status.head = head
      }
    } else if (line.startsWith('# branch.upstream ')) {
      status.upstream = line.slice('# branch.upstream '.length).trim()
    } else if (line.startsWith('# branch.ab ')) {
      const m = /\+(\d+)\s+-(\d+)/.exec(line)
      if (m) {
        status.ahead = Number(m[1])
        status.behind = Number(m[2])
      }
    } else if (line.startsWith('? ')) {
      status.files.push({
        path: unquotePath(line.slice(2)),
        indexStatus: '.',
        worktreeStatus: '.',
        untracked: true
      })
    } else if (line.startsWith('! ')) {
      status.files.push({
        path: unquotePath(line.slice(2)),
        indexStatus: '.',
        worktreeStatus: '.',
        ignored: true
      })
    } else if (line.startsWith('1 ') || line.startsWith('2 ')) {
      const isRename = line.startsWith('2 ')
      const parts = line.split(' ')
      const xy = parts[1]
      if (isRename) {
        // 2 XY sub mH mI mW hH hI Xscore path<TAB>origPath
        const pathField = parts.slice(9).join(' ')
        const [path, origPath] = pathField.split('\t')
        status.files.push({
          path: unquotePath(path),
          origPath: unquotePath(origPath ?? ''),
          indexStatus: xy[0],
          worktreeStatus: xy[1]
        })
      } else {
        // 1 XY sub mH mI mW hH hI path
        const path = parts.slice(8).join(' ')
        status.files.push({
          path: unquotePath(path),
          indexStatus: xy[0],
          worktreeStatus: xy[1]
        })
      }
    } else if (line.startsWith('u ')) {
      const parts = line.split(' ')
      const xy = parts[1]
      const path = parts.slice(10).join(' ')
      status.files.push({
        path: unquotePath(path),
        indexStatus: xy[0],
        worktreeStatus: xy[1],
        unmerged: true
      })
    }
  }

  return status
}

function unquotePath(p: string): string {
  if (p.startsWith('"') && p.endsWith('"')) {
    return p
      .slice(1, -1)
      .replace(/\\([nrt\\"])/g, (_m, c: string) => {
        if (c === 'n') return '\n'
        if (c === 'r') return '\r'
        if (c === 't') return '\t'
        return c
      })
      .replace(/\\([0-7]{3})/g, (_m, oct: string) => String.fromCharCode(parseInt(oct, 8)))
  }
  return p
}

export async function getStatus(repoPath: string, signal?: AbortSignal): Promise<GitStatusDto> {
  const { stdout } = await execGitOrThrow({
    cwd: repoPath,
    args: ['status', '--porcelain=v2', '--branch', '--untracked-files=all'],
    signal
  })
  return parsePorcelainV2(stdout)
}
