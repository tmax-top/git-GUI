import { describe, expect, it } from 'vitest'
import { isStaged, isUnstaged, isUntracked, stagedFiles, unstagedFiles } from '../../src/shared/status'
import type { GitStatusDto, StatusFileDto } from '../../src/shared/ipc'

function f(partial: Partial<StatusFileDto>): StatusFileDto {
  return { path: 'file.txt', indexStatus: '.', worktreeStatus: '.', ...partial }
}

function status(files: StatusFileDto[]): GitStatusDto {
  return { ahead: 0, behind: 0, detached: false, files }
}

describe('porcelain v2 status helpers', () => {
  it('treats "." index side as not staged', () => {
    expect(isStaged(f({ indexStatus: '.', worktreeStatus: 'M' }))).toBe(false)
    expect(isStaged(f({ indexStatus: 'M', worktreeStatus: '.' }))).toBe(true)
    expect(isStaged(f({ indexStatus: 'A', worktreeStatus: 'M' }))).toBe(true)
  })

  it('treats short-format space sides correctly', () => {
    expect(isStaged(f({ indexStatus: ' ', worktreeStatus: 'M' }))).toBe(false)
    expect(isStaged(f({ indexStatus: 'M', worktreeStatus: ' ' }))).toBe(true)
  })

  it('splits a file into exactly one group', () => {
    const unstagedOnly = f({ path: 'a', indexStatus: '.', worktreeStatus: 'M' })
    const stagedOnly = f({ path: 'b', indexStatus: 'M', worktreeStatus: '.' })
    const both = f({ path: 'c', indexStatus: 'M', worktreeStatus: 'M' })
    const s = status([unstagedOnly, stagedOnly, both])

    expect(stagedFiles(s).map((x) => x.path)).toEqual(['b', 'c'])
    expect(unstagedFiles(s).map((x) => x.path)).toEqual(['a', 'c'])
    expect(isStaged(unstagedOnly)).toBe(false)
    expect(isUnstaged(stagedOnly)).toBe(false)
  })

  it('keeps untracked out of both groups', () => {
    const untracked = f({ untracked: true })
    expect(isUntracked(untracked)).toBe(true)
    expect(isStaged(untracked)).toBe(false)
    expect(isUnstaged(untracked)).toBe(false)
  })

  it('counts unmerged files on both sides', () => {
    const unmerged = f({ indexStatus: 'U', worktreeStatus: 'U', unmerged: true })
    expect(isStaged(unmerged)).toBe(true)
    expect(isUnstaged(unmerged)).toBe(true)
  })
})
