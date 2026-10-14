import { afterEach, describe, expect, it } from 'vitest'
import { addToGitignore } from '@main/git/ignore'
import { cleanPaths, listStashes, listSubmodules } from '@main/git'
import { readFile, writeFile as fsWriteFile } from 'node:fs/promises'
import { join } from 'node:path'
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

describe('listStashes', () => {
  it('lists stashed changes', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'a.txt', 'a1\n', 'init')
    writeFile(d, 'a.txt', 'a2\n')
    git(d, 'stash', 'push', '-m', 'my stash')
    const stashes = await listStashes(d)
    expect(stashes).toHaveLength(1)
    expect(stashes[0].oid).toMatch(/^[0-9a-f]{40}$/)
    expect(stashes[0].subject).toContain('my stash')
  })

  it('returns empty for a repo without stashes', async () => {
    const r = repo()
    expect(await listStashes(r.dir)).toEqual([])
  })
})

describe('cleanPaths', () => {
  it('deletes untracked files only', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'keep.txt', 'keep\n', 'init')
    writeFile(d, 'junk.txt', 'junk\n')
    writeFile(d, 'keep.txt', 'modified\n')

    await cleanPaths(d, ['junk.txt', 'keep.txt'])

    await expect(readFile(join(d, 'junk.txt'))).rejects.toThrow()
    // tracked file survives clean even when modified
    expect(await readFile(join(d, 'keep.txt'), 'utf8')).toBe('modified\n')
  })
})

describe('addToGitignore', () => {
  it('creates .gitignore when missing', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'a.txt', 'a\n', 'init')
    await addToGitignore(d, 'dist/')
    expect(await readFile(join(d, '.gitignore'), 'utf8')).toBe('dist/\n')
  })

  it('appends without duplicating and handles missing trailing newline', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'a.txt', 'a\n', 'init')
    await fsWriteFile(join(d, '.gitignore'), 'node_modules', 'utf8')
    await addToGitignore(d, 'dist/')
    await addToGitignore(d, 'dist/')
    const content = await readFile(join(d, '.gitignore'), 'utf8')
    expect(content).toBe('node_modules\ndist/\n')
  })
})

describe('listSubmodules', () => {
  it('parses submodule status output', async () => {
    const r = repo()
    const d = r.dir
    commitFile(d, 'a.txt', 'a\n', 'init')
    const subs = await listSubmodules(d)
    expect(subs).toEqual([])
  })
})
