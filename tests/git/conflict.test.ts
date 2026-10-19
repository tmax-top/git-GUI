import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { acceptConflictSide, getConflictFile, merge, resolveConflict } from '@main/git'
import { getStatus } from '@main/git'
import { commitFile, git, makeTempRepo, writeFile, type TempRepo } from '../fixtures/repo'

const repos: TempRepo[] = []
function repo(): TempRepo {
  const r = makeTempRepo()
  repos.push(r)
  return r
}

afterEach(() => {
  while (repos.length) repos.pop()?.cleanup()
})

/** main and `other` both edit f.txt on a shared base → merge conflict. */
function divergent(): TempRepo {
  const r = repo()
  const d = r.dir
  commitFile(d, 'f.txt', 'base\n', 'init')
  git(d, 'checkout', '-b', 'other')
  commitFile(d, 'f.txt', 'other\n', 'other side')
  git(d, 'checkout', 'main')
  commitFile(d, 'f.txt', 'main\n', 'main side')
  return r
}

describe('getConflictFile', () => {
  it('reads all three stages plus the marker-laden worktree', async () => {
    const r = divergent()
    const d = r.dir
    await merge(d, 'other')

    const status = await getStatus(d)
    const f = status.files.find((x) => x.path === 'f.txt')
    expect(f?.unmerged).toBe(true)

    const c = await getConflictFile(d, 'f.txt')
    expect(c.path).toBe('f.txt')
    expect(c.base).toBe('base\n')
    expect(c.ours).toBe('main\n')
    expect(c.theirs).toBe('other\n')
    expect(c.worktree).toContain('<<<<<<<')
    expect(c.worktree).toContain('=======')
    expect(c.worktree).toContain('>>>>>>>')
    expect(c.binary).toBe(false)
  })

  it('rejects a file that is not conflicted', async () => {
    const r = repo()
    commitFile(r.dir, 'clean.txt', 'x\n', 'init')
    await expect(getConflictFile(r.dir, 'clean.txt')).rejects.toThrow(/not a conflicted/)
  })

  it('reports base as null for an add/add conflict', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'seed.txt', 'seed\n', 'init')
    git(d, 'checkout', '-b', 'other')
    writeFile(d, 'new.txt', 'from other\n')
    git(d, 'add', 'new.txt')
    git(d, 'commit', '-m', 'other adds new.txt')
    git(d, 'checkout', 'main')
    writeFile(d, 'new.txt', 'from main\n')
    git(d, 'add', 'new.txt')
    git(d, 'commit', '-m', 'main adds new.txt')
    await merge(d, 'other')

    const c = await getConflictFile(d, 'new.txt')
    // add/add: no common ancestor for this path → stage 1 absent
    expect(c.base).toBeNull()
    expect(c.ours).toBe('from main\n')
    expect(c.theirs).toBe('from other\n')
    expect(c.worktree).toContain('<<<<<<<')
  })
})

describe('resolveConflict', () => {
  it('writes the edited content and stages it', async () => {
    const r = divergent()
    const d = r.dir
    await merge(d, 'other')

    await resolveConflict(d, 'f.txt', 'resolved content\n')

    expect(readFileSync(join(d, 'f.txt'), 'utf8')).toBe('resolved content\n')
    // staged (added) → no longer unmerged
    const status = await getStatus(d)
    const f = status.files.find((x) => x.path === 'f.txt')
    expect(f?.unmerged).toBeFalsy()
    expect(git(d, 'diff', '--cached', '--name-only').trim()).toBe('f.txt')
  })

  it('leaves no conflict markers when given clean content', async () => {
    const r = divergent()
    const d = r.dir
    await merge(d, 'other')
    await resolveConflict(d, 'f.txt', 'merged\n')
    const c = await getConflictFile(d, 'f.txt').catch(() => null)
    // file is resolved → getConflictFile now throws
    expect(c).toBeNull()
  })
})

describe('acceptConflictSide', () => {
  it('takes ours: worktree becomes the main-side content and is staged', async () => {
    const r = divergent()
    const d = r.dir
    await merge(d, 'other')
    await acceptConflictSide(d, 'f.txt', 'ours')
    expect(readFileSync(join(d, 'f.txt'), 'utf8')).toBe('main\n')
    // Ours == HEAD here, so no index-vs-HEAD diff — but it must no longer be unmerged.
    const status = await getStatus(d)
    expect(status.files.find((x) => x.path === 'f.txt')?.unmerged).toBeFalsy()
  })

  it('takes theirs: worktree becomes the other-side content', async () => {
    const r = divergent()
    const d = r.dir
    await merge(d, 'other')
    await acceptConflictSide(d, 'f.txt', 'theirs')
    expect(readFileSync(join(d, 'f.txt'), 'utf8')).toBe('other\n')
  })
})

describe('full conflict lifecycle', () => {
  it('read → resolve → stage → merge completes cleanly', async () => {
    const r = divergent()
    const d = r.dir
    await merge(d, 'other')

    const before = await getConflictFile(d, 'f.txt')
    expect(before.worktree).toContain('<<<<<<<')

    await resolveConflict(d, 'f.txt', 'both sides agree\n')
    git(d, 'commit', '-m', 'merge resolved')

    expect(git(d, 'status', '--porcelain').trim()).toBe('')
    expect(readFileSync(join(d, 'f.txt'), 'utf8')).toBe('both sides agree\n')
    expect(git(d, 'log', '--format=%s', '-1').trim()).toBe('merge resolved')
  })
})
