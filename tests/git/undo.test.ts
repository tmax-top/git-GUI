import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  applyUndo,
  captureUndoSnapshot,
  clearUndoStacks,
  recordUndoEntry,
  restoreUndoSnapshot,
  undoDepth,
  undoList,
  type UndoSnapshot
} from '@main/git'
import { commitFile, git, makeTempRepo, writeFile, type TempRepo } from '../fixtures/repo'

let r: TempRepo

beforeEach(() => {
  clearUndoStacks()
  r = makeTempRepo()
})

afterEach(() => {
  r.cleanup()
  clearUndoStacks()
})

function head(d: string): string {
  return git(d, 'rev-parse', 'HEAD').trim()
}

/** First `git status --porcelain` line, leading status-column space preserved. */
function statusLine(d: string): string {
  return git(d, 'status', '--porcelain').split('\n').filter(Boolean)[0] ?? ''
}

function capture(d: string, worktree = false) {
  return captureUndoSnapshot(d, { worktree })
}

describe('captureUndoSnapshot', () => {
  it('captures head, headRef, refs and index tree', async () => {
    commitFile(r.dir, 'a.txt', 'a1\n', 'initial')
    git(r.dir, 'tag', 'v1')
    const snap = await capture(r.dir)
    expect(snap.head).toBe(head(r.dir))
    expect(snap.headRef).toBe('refs/heads/main')
    expect(snap.refs['refs/heads/main']).toBe(snap.head)
    expect(snap.refs['refs/tags/v1']).toBe(snap.head)
    expect(snap.indexTree).toBeTruthy()
    expect(snap.worktreeTree).toBeNull()
    expect(snap.fingerprint).toHaveLength(64)
  })

  it('captures the worktree tree when asked, dirty or clean', async () => {
    commitFile(r.dir, 'a.txt', 'a1\n', 'initial')
    const clean = await capture(r.dir, true)
    expect(clean.worktreeTree).toBe(clean.indexTree)
    writeFile(r.dir, 'a.txt', 'dirty\n')
    const dirty = await capture(r.dir, true)
    expect(dirty.worktreeTree).not.toBe(dirty.indexTree)
    expect(dirty.fingerprint).not.toBe(clean.fingerprint)
  })

  it('fingerprints ignore worktree-only drift when worktree=false', async () => {
    commitFile(r.dir, 'a.txt', 'a1\n', 'initial')
    const before = await capture(r.dir, false)
    writeFile(r.dir, 'a.txt', 'dirty\n')
    const after = await capture(r.dir, false)
    expect(after.fingerprint).toBe(before.fingerprint)
  })
})

describe('restoreUndoSnapshot', () => {
  it('round-trips a commit: head, refs and index come back', async () => {
    const d = r.dir
    commitFile(d, 'a.txt', 'a1\n', 'initial')
    const before = await capture(d)
    commitFile(d, 'b.txt', 'b1\n', 'second')
    const after = await capture(d)
    expect(head(d)).toBe(after.head)

    await restoreUndoSnapshot(d, before)
    expect(head(d)).toBe(before.head)
    expect(git(d, 'for-each-ref', 'refs/heads').trim()).toContain(before.head)
    // b.txt is gone from the index but the file may linger untracked.
    expect(git(d, 'status', '--porcelain')).not.toContain('A  b.txt')

    await restoreUndoSnapshot(d, after)
    expect(head(d)).toBe(after.head)
  })

  it('restores deleted refs (branch create undone)', async () => {
    const d = r.dir
    commitFile(d, 'a.txt', 'a1\n', 'initial')
    git(d, 'branch', 'feat')
    const before = await capture(d)
    git(d, 'branch', '-D', 'feat')
    const after = await capture(d)
    expect(git(d, 'for-each-ref', 'refs/heads')).not.toContain('feat')

    await restoreUndoSnapshot(d, before)
    expect(git(d, 'for-each-ref', 'refs/heads')).toContain('refs/heads/feat')
    expect(git(d, 'rev-parse', 'refs/heads/feat').trim()).toBeTruthy()

    await restoreUndoSnapshot(d, after)
    expect(git(d, 'for-each-ref', 'refs/heads')).not.toContain('refs/heads/feat')
  })

  it('restores a dirty worktree on reset --hard (worktreeTree set)', async () => {
    const d = r.dir
    commitFile(d, 'a.txt', 'a1\n', 'initial')
    writeFile(d, 'a.txt', 'dirty\n')
    const before = await capture(d, true)
    git(d, 'reset', '--hard', 'HEAD')
    expect(git(d, 'show', 'HEAD:a.txt').trim()).toBe('a1')

    await restoreUndoSnapshot(d, before)
    expect(git(d, 'show', 'HEAD:a.txt').trim()).toBe('a1')
    expect(statusLine(d)).toBe(' M a.txt')
  })

  it('restores the staged/unstaged split without touching the worktree', async () => {
    const d = r.dir
    commitFile(d, 'a.txt', 'a1\n', 'initial')
    writeFile(d, 'a.txt', 'modified\n')
    git(d, 'add', 'a.txt')
    const before = await capture(d)
    expect(statusLine(d)).toBe('M  a.txt')

    git(d, 'reset', 'HEAD', '--', 'a.txt')
    expect(statusLine(d)).toBe(' M a.txt')

    await restoreUndoSnapshot(d, before)
    expect(statusLine(d)).toBe('M  a.txt')
    // Worktree content was never rewritten.
    expect(git(d, 'show', ':a.txt')).toBe('modified\n')
  })

  it('handles an unborn target (head=null)', async () => {
    const d = r.dir
    // Repo with no commits yet, but a staged file.
    writeFile(d, 'a.txt', 'a1\n')
    git(d, 'add', 'a.txt')
    const unborn = await capture(d, true)
    expect(unborn.head).toBeNull()
    expect(unborn.headRef).toBe('refs/heads/main')
    expect(unborn.indexTree).toBeTruthy()
    expect(unborn.worktreeTree).toBeTruthy()

    commitFile(d, 'a.txt', 'a2\n', 'first')
    await restoreUndoSnapshot(d, unborn)
    expect(() => git(d, 'rev-parse', '--verify', 'HEAD')).toThrow()
    expect(statusLine(d)).toBe('A  a.txt')
    expect(git(d, 'show', ':a.txt')).toBe('a1\n')
  })
})

describe('recordUndoEntry / applyUndo', () => {
  it('undoes and redoes a commit round-trip', async () => {
    const d = r.dir
    commitFile(d, 'a.txt', 'a1\n', 'initial')
    const before = await capture(d)
    commitFile(d, 'b.txt', 'b1\n', 'second')
    const after = await capture(d)

    recordUndoEntry(d, { key: 'undo.desc.commit' }, before, after)
    const st = undoList(d)
    expect(st.canUndo).toBe(true)
    expect(st.canRedo).toBe(false)
    expect(st.undoLabel?.key).toBe('undo.desc.commit')

    const undoRes = await applyUndo(d, 'undo')
    expect(undoRes.applied).toBe(true)
    expect(head(d)).toBe(before.head)

    const st2 = undoList(d)
    expect(st2.canUndo).toBe(false)
    expect(st2.canRedo).toBe(true)

    const redoRes = await applyUndo(d, 'redo')
    expect(redoRes.applied).toBe(true)
    expect(head(d)).toBe(after.head)
  })

  it('refuses without force when the worktree drifted', async () => {
    const d = r.dir
    commitFile(d, 'a.txt', 'a1\n', 'initial')
    const before = await capture(d, true)
    commitFile(d, 'b.txt', 'b1\n', 'second')
    const after = await capture(d, true)
    recordUndoEntry(d, { key: 'undo.desc.commit' }, before, after)

    writeFile(d, 'c.txt', 'extra\n')
    const res = await applyUndo(d, 'undo')
    expect(res.applied).toBe(false)
    expect(res.currentChanged).toBe(true)
    // Nothing moved.
    expect(head(d)).toBe(after.head)

    const forced = await applyUndo(d, 'undo', true)
    expect(forced.applied).toBe(true)
    expect(head(d)).toBe(before.head)
  })

  it('refuses without force when an index-only op was followed by drift', async () => {
    const d = r.dir
    commitFile(d, 'a.txt', 'a1\n', 'initial')
    const before = await capture(d, false)
    git(d, 'tag', 'v1')
    const after = await capture(d, false)
    recordUndoEntry(d, { key: 'undo.desc.tagCreate', params: { name: 'v1' } }, before, after)

    git(d, 'tag', 'v2')
    const res = await applyUndo(d, 'undo')
    expect(res.applied).toBe(false)
    expect(res.currentChanged).toBe(true)
  })

  it('does not stack no-op entries (identical fingerprints)', async () => {
    const d = r.dir
    commitFile(d, 'a.txt', 'a1\n', 'initial')
    const snap = await capture(d)
    recordUndoEntry(d, { key: 'undo.desc.commit' }, snap, snap)
    expect(undoList(d).canUndo).toBe(false)
  })

  it('a new entry clears the redo stack', async () => {
    const d = r.dir
    commitFile(d, 'a.txt', 'a1\n', 'initial')
    const before = await capture(d)
    commitFile(d, 'b.txt', 'b1\n', 'second')
    const after = await capture(d)
    recordUndoEntry(d, { key: 'undo.desc.commit' }, before, after)

    await applyUndo(d, 'undo')
    expect(undoList(d).canRedo).toBe(true)

    // New op on the way back → redo must be cleared.
    const before2 = await capture(d)
    git(d, 'tag', 'v1')
    const after2 = await capture(d)
    recordUndoEntry(d, { key: 'undo.desc.tagCreate', params: { name: 'v1' } }, before2, after2)
    expect(undoList(d).canRedo).toBe(false)
  })

  it('caps the undo stack at 50 entries and is LIFO', () => {
    // Synthetic snapshots — the cap is pure stack logic, so no git spawns here
    // (each capture/restore costs ~10 process spawns on this machine).
    const snap = (n: number, key: string): UndoSnapshot => ({
      head: `head-${n}`,
      headRef: 'refs/heads/main',
      headTree: `tree-${n}`,
      refs: { 'refs/heads/main': `head-${n}` },
      indexTree: `index-${n}`,
      worktreeTree: null,
      fingerprint: `fp-${key}-${n}`
    })
    for (let i = 0; i < 60; i++) {
      recordUndoEntry(
        r.dir,
        { key: 'undo.desc.tagCreate', params: { name: `t${i}` } },
        snap(i, 'before'),
        snap(i + 1, 'after')
      )
    }
    // Oldest 10 entries (t0…t9) were evicted; t59 … t10 remain (50 total).
    expect(undoDepth(r.dir)).toEqual({ undo: 50, redo: 0 })
    expect(undoList(r.dir).undoLabel?.params?.name).toBe('t59')

    // A new entry evicts from the front and clears redo (LIFO + redo reset).
    recordUndoEntry(
      r.dir,
      { key: 'undo.desc.commit' },
      snap(100, 'before'),
      snap(101, 'after')
    )
    expect(undoDepth(r.dir).undo).toBe(50)
    expect(undoList(r.dir).undoLabel?.key).toBe('undo.desc.commit')
  })

  it('undoing a stage entry restores the index, not the worktree', async () => {
    const d = r.dir
    commitFile(d, 'a.txt', 'a1\n', 'initial')
    writeFile(d, 'a.txt', 'modified\n')
    const before = await capture(d, false)
    git(d, 'add', 'a.txt')
    const after = await capture(d, false)
    recordUndoEntry(d, { key: 'undo.desc.stage' }, before, after)

    const res = await applyUndo(d, 'undo')
    expect(res.applied).toBe(true)
    expect(statusLine(d)).toBe(' M a.txt')
    // Worktree content untouched by an index-only restore.
    expect(git(d, 'show', ':a.txt').trim()).toBe('a1')
  })
})
