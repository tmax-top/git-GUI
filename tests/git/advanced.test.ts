import { afterEach, describe, expect, it } from 'vitest'
import { existsSync, realpathSync } from 'node:fs'
import { join } from 'node:path'
import {
  abortOp,
  addWorktree,
  cherryPick,
  continueOp,
  deleteBranch,
  getOpState,
  merge,
  rebase,
  rebaseInteractive,
  rebaseRange,
  removeWorktree,
  renameBranch,
  revertCommits,
  reset,
  skipOp,
  stashApply,
  stashDrop,
  stashPush,
  tagCreate,
  tagDelete,
  listWorktrees
} from '@main/git'
import { addPaths } from '@main/git'
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

/** main and `other` both edit f.txt on top of a shared base → merge conflicts. */
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

describe('getOpState', () => {
  it('returns null kind on a clean repo', async () => {
    const r = repo()
    commitFile(r.dir, 'a.txt', 'a\n', 'init')
    const state = await getOpState(r.dir)
    expect(state.kind).toBeNull()
    expect(state.conflicts).toEqual([])
  })
})

describe('merge', () => {
  it('merges a clean branch', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'a.txt', 'a\n', 'init')
    git(d, 'checkout', '-b', 'feat')
    commitFile(d, 'b.txt', 'b\n', 'feat work')
    git(d, 'checkout', 'main')
    const res = await merge(d, 'feat')
    expect(res.conflicts).toEqual([])
    expect(existsSync(join(d, 'b.txt'))).toBe(true)
    expect(await getOpState(d)).toMatchObject({ kind: null })
  })

  it('stops on conflicts, exposes them, and aborts back', async () => {
    const r = divergent()
    const d = r.dir
    const res = await merge(d, 'other')
    expect(res.conflicts).toEqual(['f.txt'])

    const state = await getOpState(d)
    expect(state.kind).toBe('merge')
    expect(state.conflicts).toEqual(['f.txt'])

    await abortOp(d)
    expect((await getOpState(d)).kind).toBeNull()
    expect(git(d, 'show', 'HEAD:f.txt')).toBe('main\n')
  })

  it('continues after manually resolving conflicts', async () => {
    const r = divergent()
    const d = r.dir
    const res = await merge(d, 'other')
    expect(res.conflicts).toEqual(['f.txt'])

    writeFile(d, 'f.txt', 'resolved\n')
    await addPaths(d, ['f.txt'])
    const cont = await continueOp(d)
    expect(cont.conflicts).toEqual([])
    expect((await getOpState(d)).kind).toBeNull()
    expect(git(d, 'show', 'HEAD:f.txt')).toBe('resolved\n')
  })

  it('throws when the branch does not exist', async () => {
    const r = repo()
    commitFile(r.dir, 'a.txt', 'a\n', 'init')
    await expect(merge(r.dir, 'nope-branch')).rejects.toThrow()
  })

  it('skip/continue without an operation throw', async () => {
    const r = repo()
    commitFile(r.dir, 'a.txt', 'a\n', 'init')
    await expect(skipOp(r.dir)).rejects.toThrow()
    await expect(continueOp(r.dir)).rejects.toThrow()
    await expect(abortOp(r.dir)).rejects.toThrow()
  })
})

describe('cherryPick / revertCommits', () => {
  it('cherry-picks a commit onto another branch', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'base.txt', 'b\n', 'init')
    git(d, 'checkout', '-b', 'src')
    const sha = commitFile(d, 'picked.txt', 'p\n', 'pick me')
    git(d, 'checkout', 'main')
    const res = await cherryPick(d, [sha])
    expect(res.conflicts).toEqual([])
    expect(git(d, 'log', '--format=%s', '-1').trim()).toBe('pick me')
    expect(existsSync(join(d, 'picked.txt'))).toBe(true)
  })

  it('stops on cherry-pick conflict and aborts', async () => {
    const r = divergent()
    const d = r.dir
    const otherHead = git(d, 'rev-parse', 'other').trim()
    const res = await cherryPick(d, [otherHead])
    expect(res.conflicts).toEqual(['f.txt'])
    expect((await getOpState(d)).kind).toBe('cherry-pick')
    await abortOp(d)
    expect((await getOpState(d)).kind).toBeNull()
  })

  it('reverts a commit by creating an inverse commit', async () => {
    const r = repo()
    const d = r.dir
    const sha = commitFile(d, 'f.txt', 'added\n', 'add f')
    const res = await revertCommits(d, [sha])
    expect(res.conflicts).toEqual([])
    expect(existsSync(join(d, 'f.txt'))).toBe(false)
    expect(git(d, 'log', '--format=%s', '-1')).toContain('Revert')
  })
})

describe('reset', () => {
  it('soft keeps changes staged, mixed unstages, hard discards', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'f.txt', '1\n', 'c1')
    const h1 = git(d, 'rev-parse', 'HEAD').trim()
    commitFile(d, 'f.txt', '2\n', 'c2')

    await reset(d, 'soft', h1)
    expect(git(d, 'diff', '--cached', '--name-only').trim()).toBe('f.txt')
    expect(git(d, 'diff', '--name-only').trim()).toBe('')

    await reset(d, 'mixed', h1)
    expect(git(d, 'diff', '--cached', '--name-only').trim()).toBe('')
    expect(git(d, 'diff', '--name-only').trim()).toBe('f.txt')

    await reset(d, 'hard', h1)
    expect(git(d, 'status', '--short').trim()).toBe('')
    expect(git(d, 'show', 'HEAD:f.txt').trim()).toBe('1')
  })

  it('rejects an invalid mode', async () => {
    const r = repo()
    commitFile(r.dir, 'a.txt', 'a\n', 'init')
    // @ts-expect-error intentional bad mode
    await expect(reset(r.dir, 'nuclear', 'HEAD')).rejects.toThrow(/invalid reset mode/)
  })
})

describe('rebase', () => {
  it('replays a branch onto upstream', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'base.txt', 'b\n', 'init')
    git(d, 'checkout', '-b', 'feat')
    commitFile(d, 'one.txt', '1\n', 'one')
    git(d, 'checkout', 'main')
    commitFile(d, 'two.txt', '2\n', 'two')
    git(d, 'checkout', 'feat')
    const res = await rebase(d, 'main')
    expect(res.conflicts).toEqual([])
    const subjects = git(d, 'log', '--format=%s').trim().split('\n')
    expect(subjects).toEqual(['one', 'two', 'init'])
  })

  it('stops with conflicts and reports rebase state', async () => {
    const r = divergent()
    const d = r.dir
    git(d, 'checkout', 'other')
    const res = await rebase(d, 'main')
    expect(res.conflicts).toEqual(['f.txt'])
    const state = await getOpState(d)
    expect(state.kind).toBe('rebase')
    await abortOp(d)
    expect((await getOpState(d)).kind).toBeNull()
  })
})

describe('rebaseInteractive', () => {
  it('drops, reorders and rewords without opening an editor', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'base.txt', 'b\n', 'init')
    git(d, 'checkout', '-b', 'feat')
    const c1 = commitFile(d, 'one.txt', '1\n', 'first commit')
    const c2 = commitFile(d, 'two.txt', '2\n', 'second commit')
    const c3 = commitFile(d, 'three.txt', '3\n', 'third commit')

    const res = await rebaseInteractive(d, 'main', [
      { oid: c3, action: 'pick' },
      { oid: c1, action: 'reword', message: 'renamed first commit' },
      { oid: c2, action: 'drop' }
    ])
    expect(res.conflicts).toEqual([])

    const subjects = git(d, 'log', '--format=%s').trim().split('\n')
    expect(subjects).toEqual(['renamed first commit', 'third commit', 'init'])
    expect(existsSync(join(d, 'two.txt'))).toBe(false)
    expect(existsSync(join(d, 'three.txt'))).toBe(true)
  })

  it('rejects an invalid plan', async () => {
    const r = repo()
    commitFile(r.dir, 'a.txt', 'a\n', 'init')
    await expect(
      rebaseInteractive(r.dir, 'main', [{ oid: 'zzzz', action: 'pick' as const }])
    ).rejects.toThrow(/invalid oid/)
    await expect(
      rebaseInteractive(r.dir, 'main', [
        // @ts-expect-error intentional bad action
        { oid: 'abcdef1234567890', action: 'obliterate' }
      ])
    ).rejects.toThrow(/invalid rebase action/)
  })
})

describe('rebaseRange', () => {
  it('lists base..HEAD oldest-first with short oids and subjects', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'base.txt', 'b\n', 'init')
    const base = git(d, 'rev-parse', 'HEAD').trim()
    git(d, 'checkout', '-b', 'feat')
    const c1 = commitFile(d, 'one.txt', '1\n', 'first subject')
    const c2 = commitFile(d, 'two.txt', '2\n', 'second subject')

    const range = await rebaseRange(d, base)
    expect(range.map((c) => c.subject)).toEqual(['first subject', 'second subject'])
    expect(range.map((c) => c.oid)).toEqual([c1, c2])
    expect(range[0].shortOid).toBe(c1.slice(0, 8))
    expect(range.every((c) => c.shortOid.length === 8)).toBe(true)
  })

  it('returns an empty range when base is HEAD, and replays after rebase', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'a.txt', 'a\n', 'init')
    git(d, 'checkout', '-b', 'feat')
    commitFile(d, 'b.txt', 'b\n', 'next')
    const featHead = git(d, 'rev-parse', 'HEAD').trim()

    // base == HEAD → nothing to replay
    expect(await rebaseRange(d, featHead)).toEqual([])

    // main advances, feat rebases onto it → feat's own commits remain replayable
    git(d, 'checkout', 'main')
    commitFile(d, 'c.txt', 'c\n', 'main work')
    git(d, 'checkout', 'feat')
    expect((await rebaseRange(d, 'main')).map((c) => c.subject)).toEqual(['next'])

    git(d, 'rebase', 'main')
    const rebased = await rebaseRange(d, 'main')
    expect(rebased.map((c) => c.subject)).toEqual(['next'])
    // a different oid: the commit was rewritten onto main
    expect(rebased[0].oid).not.toBe(featHead)
  })

  it('rejects an invalid base ref', async () => {
    const r = repo()
    commitFile(r.dir, 'a.txt', 'a\n', 'init')
    await expect(rebaseRange(r.dir, 'not a ref')).rejects.toThrow()
  })
})

describe('stash', () => {
  it('push with message, apply and pop', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'f.txt', '1\n', 'init')
    writeFile(d, 'f.txt', '2\n')
    await stashPush(d, { message: 'wip work' })
    expect(git(d, 'status', '--short').trim()).toBe('')
    expect(git(d, 'stash', 'list').trim()).toContain('wip work')

    const res = await stashApply(d, 'stash@{0}', { pop: true })
    expect(res.conflicts).toEqual([])
    expect(git(d, 'stash', 'list').trim()).toBe('')
    expect(git(d, 'diff', '--', 'f.txt')).toContain('+2')
  })

  it('staged-only stash takes index changes and keeps unstaged ones', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'f.txt', '1\n', 'init')
    commitFile(d, 'g.txt', '1\n', 'add g')
    writeFile(d, 'f.txt', '2\n')
    git(d, 'add', 'f.txt')
    writeFile(d, 'g.txt', '2\n')
    await stashPush(d, { staged: true })
    // f.txt staged change is stashed away; g.txt unstaged change survives
    expect(git(d, 'diff', '--cached', '--name-only').trim()).toBe('')
    expect(git(d, 'diff', '--name-only').trim()).toBe('g.txt')
    expect(git(d, 'stash', 'show', '-p', 'stash@{0}')).toContain('+2')
    await stashDrop(d, 'stash@{0}')
    expect(git(d, 'stash', 'list').trim()).toBe('')
  })

  it('stash with untracked removes the file from the worktree', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'f.txt', '1\n', 'init')
    writeFile(d, 'junk.txt', 'junk\n')
    await stashPush(d, { untracked: true, message: 'with junk' })
    expect(existsSync(join(d, 'junk.txt'))).toBe(false)
    expect(git(d, 'stash', 'list')).toContain('with junk')
  })

  it('apply conflict returns conflict paths', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'f.txt', '1\n', 'init')
    writeFile(d, 'f.txt', 'stash-side\n')
    await stashPush(d, { message: 'conflicting' })
    // advance HEAD so applying the stash creates a real 3-way conflict
    commitFile(d, 'f.txt', 'main-side\n', 'main moved on')
    const res = await stashApply(d, 'stash@{0}')
    expect(res.conflicts).toEqual(['f.txt'])
    expect((await getOpState(d)).conflicts).toEqual(['f.txt'])
    git(d, 'reset', '--hard', 'HEAD')
    await stashDrop(d, 'stash@{0}')
  })
})

describe('tags', () => {
  it('creates annotated and lightweight tags, then deletes them', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'a.txt', 'a\n', 'init')

    await tagCreate(d, 'v1.0', { message: 'release 1.0' })
    expect(git(d, 'cat-file', '-t', 'refs/tags/v1.0').trim()).toBe('tag')

    await tagCreate(d, 'v-lite')
    expect(git(d, 'cat-file', '-t', 'refs/tags/v-lite').trim()).toBe('commit')

    await tagDelete(d, ['v1.0', 'v-lite'])
    expect(git(d, 'tag', '-l').trim()).toBe('')
  })

  it('throws when deleting nothing', async () => {
    const r = repo()
    await expect(tagDelete(r.dir, [])).rejects.toThrow()
  })
})

describe('branches', () => {
  it('deletes and renames branches', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'a.txt', 'a\n', 'init')
    git(d, 'branch', 'doomed')
    await deleteBranch(d, 'doomed')
    expect(git(d, 'branch', '--list', 'doomed').trim()).toBe('')

    git(d, 'branch', 'old-name')
    await renameBranch(d, 'old-name', 'new-name')
    expect(git(d, 'branch', '--list', 'new-name').trim()).toContain('new-name')
  })
})

describe('worktrees', () => {
  it('adds, lists and removes a worktree', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'a.txt', 'a\n', 'init')
    const wt = `${r.dir}-wt`

    await addWorktree(d, wt, { branch: 'wt-branch' })
    const wtReal = realpathSync(wt)
    const list = await listWorktrees(d)
    expect(list.some((w) => realpathSync(w.path) === wtReal)).toBe(true)
    expect(list.some((w) => w.branch === 'wt-branch')).toBe(true)

    await removeWorktree(d, wt)
    const after = await listWorktrees(d)
    expect(after.some((w) => w.path === wt || realpathSync(w.path) === wtReal)).toBe(false)
  })
})
