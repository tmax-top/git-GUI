import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { execGit } from '@main/git/exec'
import {
  addPaths,
  checkout,
  commit,
  createBranch,
  discardPaths,
  initRepo,
  isRepo,
  listBranches,
  listTags,
  unstagePaths
} from '@main/git/ops'
import { getStatus } from '@main/git/status'
import { git, makeTempRepo, writeFile } from '../fixtures/repo'

describe('ops on real repos', () => {
  it('initRepo creates a repo with the requested default branch', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitgui-init-'))
    try {
      await initRepo(dir, 'main')
      expect(await isRepo(dir)).toBe(true)
      expect(git(dir, 'symbolic-ref', '--short', 'HEAD').trim()).toBe('main')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('reports a non-repo directory', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitgui-nonrepo-'))
    try {
      expect(await isRepo(dir)).toBe(false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('add / unstage / discard / commit roundtrip', async () => {
    const repo = makeTempRepo()
    try {
      writeFileSync(join(repo.dir, 'a.txt'), 'one\n', 'utf8')
      await addPaths(repo.dir, ['a.txt'])
      let s = await getStatus(repo.dir)
      expect(s.files[0]).toMatchObject({ path: 'a.txt', indexStatus: 'A' })

      await unstagePaths(repo.dir, ['a.txt'])
      s = await getStatus(repo.dir)
      expect(s.files[0]).toMatchObject({ path: 'a.txt', indexStatus: '.' })

      await addPaths(repo.dir, ['a.txt'])
      const oid = await commit(repo.dir, { message: 'add a' })
      expect(oid).toMatch(/^[0-9a-f]{7,40}$/)
      s = await getStatus(repo.dir)
      expect(s.files).toHaveLength(0)

      writeFile(repo.dir, 'a.txt', 'two\n')
      await discardPaths(repo.dir, ['a.txt'])
      expect(git(repo.dir, 'show', 'HEAD:a.txt')).toBe('one\n')
    } finally {
      repo.cleanup()
    }
  })

  it('amend rewrites the last commit', async () => {
    const repo = makeTempRepo()
    try {
      writeFileSync(join(repo.dir, 'a.txt'), 'x\n', 'utf8')
      await addPaths(repo.dir, ['a.txt'])
      await commit(repo.dir, { message: 'first' })
      const before = git(repo.dir, 'rev-parse', 'HEAD').trim()
      await commit(repo.dir, { message: 'first amended', amend: true })
      const after = git(repo.dir, 'rev-parse', 'HEAD').trim()
      expect(after).not.toBe(before)
      expect(git(repo.dir, 'log', '-1', '--format=%s').trim()).toBe('first amended')
    } finally {
      repo.cleanup()
    }
  })

  it('createBranch / checkout / listBranches / listTags', async () => {
    const repo = makeTempRepo()
    try {
      writeFileSync(join(repo.dir, 'a.txt'), 'x\n', 'utf8')
      await addPaths(repo.dir, ['a.txt'])
      await commit(repo.dir, { message: 'init' })

      await createBranch(repo.dir, 'feature')
      await checkout(repo.dir, 'feature')
      expect(git(repo.dir, 'symbolic-ref', '--short', 'HEAD').trim()).toBe('feature')

      const branches = await listBranches(repo.dir)
      const names = branches.filter((b) => !b.isRemote).map((b) => b.name)
      expect(names).toContain('main')
      expect(names).toContain('feature')

      // refs/remotes/<remote>/HEAD is a symref alias, not a branch: it must not
      // show up as a bogus "<remote>" entry in the branch list.
      git(repo.dir, 'update-ref', 'refs/remotes/origin/main', 'HEAD')
      git(repo.dir, 'symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main')
      const withRemote = await listBranches(repo.dir)
      expect(withRemote.filter((b) => b.isRemote).map((b) => b.name)).toEqual(['origin/main'])

      git(repo.dir, 'tag', 'v1.0.0')
      const tags = await listTags(repo.dir)
      expect(tags.map((t) => t.name)).toContain('v1.0.0')
    } finally {
      repo.cleanup()
    }
  })
})

describe('execGit basics', () => {
  it('captures stdout and non-zero exit without throwing', async () => {
    const result = await execGit({ cwd: tmpdir(), args: ['rev-parse', '--verify', 'no-such-ref'] })
    expect(result.code).not.toBe(0)
  })

  it('supports abort signal', async () => {
    const controller = new AbortController()
    controller.abort()
    const result = await execGit({
      cwd: tmpdir(),
      args: ['status'],
      signal: controller.signal
    }).catch((e) => ({ code: -999, err: e }))
    expect('err' in result ? result.code === -999 : true).toBe(true)
  })
})
