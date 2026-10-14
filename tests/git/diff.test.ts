import { describe, expect, it } from 'vitest'
import { getDiff, parseUnifiedDiff } from '@main/git/diff'
import { commitFile, makeTempRepo, writeFile } from '../fixtures/repo'

describe('parseUnifiedDiff', () => {
  it('parses a single-file single-hunk diff', () => {
    const text = [
      'diff --git a/file.txt b/file.txt',
      'index 111..222 100644',
      '--- a/file.txt',
      '+++ b/file.txt',
      '@@ -1,3 +1,4 @@',
      ' line1',
      '-line2',
      '+line2 changed',
      '+line2.5',
      ' line3',
      ''
    ].join('\n')

    const files = parseUnifiedDiff(text)
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('file.txt')
    expect(files[0].hunks).toHaveLength(1)
    const hunk = files[0].hunks[0]
    expect(hunk.oldStart).toBe(1)
    expect(hunk.newStart).toBe(1)
    expect(hunk.lines.filter((l) => l.type === '+')).toHaveLength(2)
    expect(hunk.lines.filter((l) => l.type === '-')).toHaveLength(1)
  })

  it('parses new file, rename and binary markers', () => {
    const newText = [
      'diff --git a/new.txt b/new.txt',
      'new file mode 100644',
      'index 000..111',
      '--- /dev/null',
      '+++ b/new.txt',
      '@@ -0,0 +1 @@',
      '+hello',
      ''
    ].join('\n')
    const newFiles = parseUnifiedDiff(newText)
    expect(newFiles[0].status).toBe('new')
    expect(newFiles[0].hunks[0].lines[0]).toMatchObject({ type: '+', content: 'hello' })

    const renameText = [
      'diff --git a/old.txt b/newname.txt',
      'similarity index 100%',
      'rename from old.txt',
      'rename to newname.txt',
      ''
    ].join('\n')
    const renames = parseUnifiedDiff(renameText)
    expect(renames[0].status).toBe('renamed')
    expect(renames[0].path).toBe('newname.txt')
    expect(renames[0].origPath).toBe('old.txt')

    const binText = ['diff --git a/img.png b/img.png', 'index 111..222 100644', 'Binary files a/img.png and b/img.png differ', ''].join('\n')
    const bins = parseUnifiedDiff(binText)
    expect(bins[0].binary).toBe(true)
  })

  it('parses multi-file diffs', () => {
    const text = [
      'diff --git a/a.txt b/a.txt',
      '--- a/a.txt',
      '+++ b/a.txt',
      '@@ -1 +1 @@',
      '-a',
      '+b',
      'diff --git a/c.txt b/c.txt',
      '--- a/c.txt',
      '+++ b/c.txt',
      '@@ -1 +1 @@',
      '-c',
      '+d',
      ''
    ].join('\n')
    const files = parseUnifiedDiff(text)
    expect(files.map((f) => f.path)).toEqual(['a.txt', 'c.txt'])
  })
})

describe('getDiff on a real repo', () => {
  it('returns unstaged and staged diffs separately', async () => {
    const repo = makeTempRepo()
    try {
      commitFile(repo.dir, 'a.txt', 'one\ntwo\n', 'init')
      writeFile(repo.dir, 'a.txt', 'one\nTWO\n')

      const unstaged = await getDiff(repo.dir)
      expect(unstaged).toHaveLength(1)
      expect(unstaged[0].path).toBe('a.txt')
      expect(unstaged[0].hunks[0].lines.some((l) => l.type === '-' && l.content === 'two')).toBe(true)

      const { git } = await import('../fixtures/repo')
      git(repo.dir, 'add', 'a.txt')
      const staged = await getDiff(repo.dir, { cached: true })
      expect(staged).toHaveLength(1)
      const empty = await getDiff(repo.dir)
      expect(empty).toHaveLength(0)
    } finally {
      repo.cleanup()
    }
  })
})
