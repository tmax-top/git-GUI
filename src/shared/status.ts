import type { GitStatusDto, StatusFileDto } from './ipc'

export function isUntracked(f: StatusFileDto): boolean {
  return f.untracked === true || f.indexStatus === '?'
}

export function isUnmerged(f: StatusFileDto): boolean {
  return f.unmerged === true || f.indexStatus === 'U' || f.worktreeStatus === 'U'
}

/** Has staged (index) changes — unmerged entries count as both sides. */
export function isStaged(f: StatusFileDto): boolean {
  if (isUnmerged(f)) return true
  if (isUntracked(f)) return false
  // porcelain v2 marks an unchanged side with '.', short format uses ' '
  return f.indexStatus !== ' ' && f.indexStatus !== '' && f.indexStatus !== '.'
}

/** Has worktree changes (does not include untracked). */
export function isUnstaged(f: StatusFileDto): boolean {
  if (isUnmerged(f)) return true
  if (isUntracked(f)) return false
  return f.worktreeStatus !== '.' && f.worktreeStatus !== '' && f.worktreeStatus !== ' '
}

export function stagedFiles(status: GitStatusDto | null): StatusFileDto[] {
  return status ? status.files.filter(isStaged) : []
}

export function unstagedFiles(status: GitStatusDto | null): StatusFileDto[] {
  return status ? status.files.filter(isUnstaged) : []
}

export function untrackedFiles(status: GitStatusDto | null): StatusFileDto[] {
  return status ? status.files.filter(isUntracked) : []
}
