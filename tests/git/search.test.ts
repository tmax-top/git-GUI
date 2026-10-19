import { afterEach, describe, expect, it } from 'vitest'
import { searchCommits, searchContent, searchFiles } from '@main/git'
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

describe('searchCommits', () => {
  it('finds commits by literal substring, case-insensitively', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'a.txt', 'a1\n', 'Add the Alpha Feature')
    commitFile(d, 'b.txt', 'b1\n', 'unrelated change')
    commitFile(d, 'c.txt', 'c1\n', 'fix alpha regression')

    const hits = await searchCommits(d, 'ALPHA')
    expect(hits.map((h) => h.subject)).toEqual([
      'fix alpha regression',
      'Add the Alpha Feature'
    ])
    expect(hits[0].oid).toHaveLength(40)
    expect(hits[0].shortOid.length).toBeLessThan(40)
    expect(hits[0].authorName).toBe('Test User')
    expect(hits[0].authorTime).toBeGreaterThan(0)
  })

  it('treats regex metacharacters literally (fixed-strings)', async () => {
    const r = repo()
    commitFile(r.dir, 'a.txt', 'a\n', 'fix bug (critical)')
    const hits = await searchCommits(r.dir, '(critical)')
    expect(hits).toHaveLength(1)
    expect(await searchCommits(r.dir, '(nonexistent)')).toHaveLength(0)
  })

  it('honours the limit', async () => {
    const r = repo()
    const d = r.dir
    for (let i = 0; i < 5; i++) commitFile(d, `f${i}.txt`, `${i}\n`, `common subject ${i}`)
    expect(await searchCommits(d, 'common subject', 3)).toHaveLength(3)
  })
})

describe('searchFiles', () => {
  it('matches tracked paths case-insensitively', async () => {
    const r = repo()
    const d = r.dir
    writeFile(d, 'src/components/Button.tsx', 'x\n')
    writeFile(d, 'src/utils/format.ts', 'y\n')
    writeFile(d, 'README.md', 'z\n')
    git(d, 'add', '-A')
    git(d, 'commit', '-m', 'init')

    const hits = await searchFiles(d, 'BUTTON')
    expect(hits).toEqual(['src/components/Button.tsx'])

    const byDir = await searchFiles(d, 'src/')
    expect(byDir.sort()).toEqual(['src/components/Button.tsx', 'src/utils/format.ts'])
  })

  it('includes untracked but not ignored files', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'tracked.txt', 't\n', 'init')
    writeFile(d, 'untracked-notes.md', 'n\n')
    writeFile(d, 'ignored.log', 'i\n')
    writeFile(d, '.gitignore', '*.log\n')
    git(d, 'add', '-f', '.gitignore')
    git(d, 'commit', '-m', 'ignore logs')

    const all = await searchFiles(d, '.')
    expect(all).toContain('untracked-notes.md')
    expect(all).toContain('tracked.txt')
    expect(all).not.toContain('ignored.log')
  })

  it('honours the limit', async () => {
    const r = repo()
    const d = r.dir
    for (let i = 0; i < 6; i++) writeFile(d, `dir/match-${i}.txt`, 'x\n')
    git(d, 'add', '-A')
    git(d, 'commit', '-m', 'init')
    expect(await searchFiles(d, 'match-', 4)).toHaveLength(4)
  })
})

describe('searchContent', () => {
  it('finds working-tree lines with path and line number', async () => {
    const r = repo()
    const d = r.dir
    writeFile(d, 'app.js', 'const a = 1\nconst needleValue = 2\nconst b = 3\n')
    writeFile(d, 'other.js', 'nothing here\n')
    git(d, 'add', '-A')
    git(d, 'commit', '-m', 'init')

    const hits = await searchContent(d, 'needle')
    expect(hits).toHaveLength(1)
    expect(hits[0].path).toBe('app.js')
    expect(hits[0].line).toBe(2)
    expect(hits[0].text).toContain('needleValue')
  })

  it('returns empty (not an error) on no match', async () => {
    const r = repo()
    commitFile(r.dir, 'a.txt', 'hello\n', 'init')
    await expect(searchContent(r.dir, 'zzz-not-there')).resolves.toEqual([])
  })

  it('treats regex metacharacters literally', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'a.txt', 'call(x, y)\n', 'init')
    const hits = await searchContent(d, 'call(x, y)')
    expect(hits).toHaveLength(1)
  })

  it('sees untracked files', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'a.txt', 'a\n', 'init')
    writeFile(d, 'draft.md', 'fresh idea inside\n')
    const hits = await searchContent(d, 'fresh idea')
    expect(hits).toHaveLength(1)
    expect(hits[0].path).toBe('draft.md')
  })

  it('skips binary files', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'a.txt', 'text\n', 'init')
    writeFile(d, 'blob.bin', 'needle\u0000\u0001binary\n')
    const hits = await searchContent(d, 'needle')
    expect(hits).toHaveLength(0)
  })
})
