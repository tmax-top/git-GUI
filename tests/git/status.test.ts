import { describe, expect, it } from 'vitest'
import { parsePorcelainV2 } from '@main/git/status'
import { getStatus } from '@main/git'
import { commitFile, git, makeTempRepo, writeFile } from '../fixtures/repo'

describe('parsePorcelainV2', () => {
  it('parses branch headers and ordinary entries', () => {
    const output = [
      '# branch.oid 1234567890abcdef1234567890abcdef12345678',
      '# branch.head main',
      '# branch.upstream origin/main',
      '# branch.ab +2 -1',
      '1 M. N... 100644 100644 100644 aaa bbb modified.txt',
      '1 .M N... 100644 100644 100644 aaa bbb worktree.txt',
      '2 R. N... 100644 100644 100644 aaa bbb R100 new.txt\told.txt',
      '? untracked.txt',
      '! ignored.log'
    ].join('\n')

    const s = parsePorcelainV2(output)
    expect(s.oid).toBe('1234567890abcdef1234567890abcdef12345678')
    expect(s.head).toBe('main')
    expect(s.upstream).toBe('origin/main')
    expect(s.ahead).toBe(2)
    expect(s.behind).toBe(1)
    expect(s.detached).toBe(false)

    expect(s.files).toHaveLength(5)
    expect(s.files[0]).toMatchObject({
      path: 'modified.txt',
      indexStatus: 'M',
      worktreeStatus: '.'
    })
    expect(s.files[1]).toMatchObject({ path: 'worktree.txt', indexStatus: '.', worktreeStatus: 'M' })
    expect(s.files[2]).toMatchObject({ path: 'new.txt', origPath: 'old.txt', indexStatus: 'R' })
    expect(s.files[3]).toMatchObject({ path: 'untracked.txt', untracked: true })
    expect(s.files[4]).toMatchObject({ path: 'ignored.log', ignored: true })
  })

  it('parses unmerged entries', () => {
    const output = ['u UU N... 100644 100644 100644 100644 aaa bbb ccc conflict.txt'].join('\n')
    const s = parsePorcelainV2(output)
    expect(s.files[0]).toMatchObject({ path: 'conflict.txt', unmerged: true })
  })
})

describe('getStatus on a real repo', () => {
  it('reports clean repo then modifications', async () => {
    const repo = makeTempRepo()
    try {
      commitFile(repo.dir, 'a.txt', 'hello\n', 'init')
      const clean = await getStatus(repo.dir)
      expect(clean.head).toBe('main')
      expect(clean.files).toHaveLength(0)

      writeFile(repo.dir, 'a.txt', 'hello\nworld\n')
      writeFile(repo.dir, 'new.txt', 'x\n')
      const dirty = await getStatus(repo.dir)
      const paths = dirty.files.map((f) => f.path).sort()
      expect(paths).toEqual(['a.txt', 'new.txt'])

      git(repo.dir, 'add', 'a.txt')
      const staged = await getStatus(repo.dir)
      const a = staged.files.find((f) => f.path === 'a.txt')
      expect(a?.indexStatus).toBe('M')
    } finally {
      repo.cleanup()
    }
  })
})
