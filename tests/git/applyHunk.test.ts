import { afterEach, describe, expect, it } from 'vitest'
import { applyPatchToIndex } from '@main/git/applyHunk'
import { getDiffText, getUntrackedDiff, parseUnifiedDiff } from '@main/git/diff'
import { buildHunkPatch, commonAffix } from '@shared/diff'
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

describe('hunk-level staging', () => {
  it('stages only the selected hunk', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'f.txt', 'l1\nl2\nl3\nl4\nl5\nl6\nl7\nl8\nl9\nl10\n', 'init')
    writeFile(d, 'f.txt', 'L1\nl2\nl3\nl4\nl5\nl6\nl7\nl8\nl9\nL10\n')

    const text = await getDiffText(d, { paths: ['f.txt'] })
    const files = parseUnifiedDiff(text)
    expect(files).toHaveLength(1)
    expect(files[0].hunks.length).toBeGreaterThanOrEqual(2)

    const patch = buildHunkPatch(files[0], 0)
    expect(patch).toBeTruthy()
    await applyPatchToIndex(d, patch!)

    const staged = git(d, 'diff', '--cached', '--', 'f.txt').split('\n')
    expect(staged).toContain('+L1')
    expect(staged).not.toContain('+L10')

    const unstaged = git(d, 'diff', '--', 'f.txt').split('\n')
    expect(unstaged).toContain('+L10')
    expect(unstaged).not.toContain('+L1')
  })

  it('unstages a staged hunk via reverse apply', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'f.txt', 'a\nb\nc\n', 'init')
    writeFile(d, 'f.txt', 'A\nb\nc\n')
    git(d, 'add', 'f.txt')

    const text = await getDiffText(d, { cached: true, paths: ['f.txt'] })
    const files = parseUnifiedDiff(text)
    const patch = buildHunkPatch(files[0], 0)
    await applyPatchToIndex(d, patch!, true)

    expect(git(d, 'diff', '--cached', '--', 'f.txt')).toBe('')
    expect(git(d, 'status', '--porcelain=v2').trim()).toContain('M')
  })

  it('stages an untracked file through a --no-index patch', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'seed.txt', 'seed\n', 'init')
    writeFile(d, 'new.txt', 'n1\nn2\n')

    const text = await getUntrackedDiff(d, 'new.txt')
    expect(text).toContain('diff --git')
    expect(text).toContain('new file mode')

    const files = parseUnifiedDiff(text)
    const patch = buildHunkPatch(files[0], 0)
    await applyPatchToIndex(d, patch!)

    const status = git(d, 'status', '--porcelain=v2')
    expect(status).toContain('new.txt')
    expect(status.split('\n').find((l) => l.includes('new.txt'))).toMatch(/^1 A/)
  })
})

describe('getUntrackedDiff', () => {
  it('produces a diff against /dev/null', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'seed.txt', 'seed\n', 'init')
    writeFile(d, 'u.txt', 'hello\n')
    const text = await getUntrackedDiff(d, 'u.txt')
    expect(text).toMatch(/^diff --git/)
    expect(text).toContain('+hello')
  })
})

describe('buildHunkPatch / commonAffix', () => {
  it('reconstructs a valid patch with file header', () => {
    const diff = [
      'diff --git a/x.txt b/x.txt',
      'index 1111111..2222222 100644',
      '--- a/x.txt',
      '+++ b/x.txt',
      '@@ -1,2 +1,2 @@',
      ' old',
      '-line',
      '+LINE',
      ''
    ].join('\n')
    const files = parseUnifiedDiff(diff)
    const patch = buildHunkPatch(files[0], 0)
    expect(patch).toContain('--- a/x.txt')
    expect(patch).toContain('@@ -1,2 +1,2 @@')
    expect(patch).toContain('-line')
    expect(patch).toContain('+LINE')
    expect(patch!.endsWith('\n')).toBe(true)
  })

  it('returns null for out-of-range hunk', () => {
    const files = parseUnifiedDiff('diff --git a/x b/x\n--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b\n')
    expect(buildHunkPatch(files[0], 5)).toBeNull()
  })

  it('computes common affix', () => {
    expect(commonAffix('hello world', 'hello there')).toEqual({ prefix: 6, suffix: 0 })
    expect(commonAffix('abc', 'abc')).toEqual({ prefix: 3, suffix: 0 })
    expect(commonAffix('', 'x')).toEqual({ prefix: 0, suffix: 0 })
  })
})

describe('getCommitDiffText on merges', () => {
  it('diffs a merge commit against its first parent', async () => {
    const { getCommitDiffText } = await import('@main/git/diff')
    const { makeMergeRepo } = await import('../fixtures/repo')
    const r = makeMergeRepo()
    repos.push(r)
    const head = git(r.dir, 'rev-parse', 'HEAD').trim()
    const text = await getCommitDiffText(r.dir, head)
    // feature work (b.txt) came in via the merge — visible vs first parent (main)
    expect(text).toContain('b.txt')
  })
})
