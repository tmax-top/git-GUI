import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { gitflowFinish, gitflowInit, gitflowStart, gitflowStatus } from '@main/git/gitflow'

const env = {
  ...process.env,
  LC_ALL: 'C',
  GIT_AUTHOR_NAME: 'T',
  GIT_AUTHOR_EMAIL: 't@e.com',
  GIT_COMMITTER_NAME: 'T',
  GIT_COMMITTER_EMAIL: 't@e.com'
}

describe('gitflow (plain git)', () => {
  let repo: string
  let n = 0

  const git = (...args: string[]): string =>
    execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', env })

  const commit = (file: string, text: string): void => {
    writeFileSync(join(repo, file), text)
    git('add', file)
    git('commit', '-q', '-m', `add ${file}`)
  }

  const mergeCommitCount = (branch: string): number =>
    Number(git('rev-list', '--count', '--merges', branch).trim())

  const hasFile = (rev: string, file: string): boolean => {
    try {
      git('cat-file', '-e', `${rev}:${file}`)
      return true
    } catch {
      return false
    }
  }

  const isAncestor = (ancestor: string, descendant: string): boolean => {
    try {
      git('merge-base', '--is-ancestor', ancestor, descendant)
      return true
    } catch {
      return false
    }
  }

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'gitgui-gitflow-'))
    execFileSync('git', ['init', '-q', '-b', 'main', repo], { env })
    git('config', 'user.name', 'T')
    git('config', 'user.email', 't@e.com')
    commit('base.txt', 'v1\n')
  })

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true })
  })

  it('status detects main + missing develop', async () => {
    const s = await gitflowStatus(repo)
    expect(s.mainBranch).toBe('main')
    expect(s.developExists).toBe(false)
    expect(s.currentBranch).toBe('main')
  })

  it('status falls back to master when main is absent', async () => {
    git('branch', '-m', 'master')
    const s = await gitflowStatus(repo)
    expect(s.mainBranch).toBe('master')
  })

  it('init creates develop off main and is idempotent', async () => {
    await gitflowInit(repo)
    expect(git('rev-parse', '--abbrev-ref', 'HEAD').trim()).toBe('develop')
    expect((await gitflowStatus(repo)).developExists).toBe(true)

    git('checkout', 'main')
    await gitflowInit(repo) // no throw, no duplicate
    expect(git('branch', '--list', 'develop').trim()).toBe('develop')
  })

  it('feature lifecycle: start → commit → finish merges into develop only', async () => {
    await gitflowInit(repo)
    git('checkout', 'main')

    await gitflowStart(repo, 'feature', 'search')
    expect(git('rev-parse', '--abbrev-ref', 'HEAD').trim()).toBe('feature/search')
    expect((await gitflowStatus(repo)).currentKind).toBe('feature')

    n++
    commit(`f${n}.txt`, 'work\n')
    await gitflowFinish(repo, 'feature')

    // landed on develop, feature branch gone, merge is a real merge commit
    expect(git('rev-parse', '--abbrev-ref', 'HEAD').trim()).toBe('develop')
    expect(git('branch', '--list', 'feature/search').trim()).toBe('')
    expect(mergeCommitCount('develop')).toBe(1)
    expect(mergeCommitCount('main')).toBe(0)
    // the feature commit is reachable from develop
    expect(hasFile('develop', `f${n}.txt`)).toBe(true)
  })

  it('release lifecycle: finish merges into develop AND main', async () => {
    await gitflowInit(repo)
    git('checkout', 'develop')
    await gitflowStart(repo, 'release', '1.0')
    commit('release.txt', 'rc\n')
    await gitflowFinish(repo, 'release')

    expect(git('rev-parse', '--abbrev-ref', 'HEAD').trim()).toBe('develop')
    expect(git('branch', '--list', 'release/1.0').trim()).toBe('')
    expect(mergeCommitCount('main')).toBe(1)
    expect(hasFile('main', 'release.txt')).toBe(true)
  })

  it('hotfix lifecycle: branches from main, finish merges into main AND develop', async () => {
    await gitflowInit(repo)
    git('checkout', 'develop')
    // advance develop so the lines diverge
    commit('dev-only.txt', 'dev\n')
    git('checkout', 'main')

    await gitflowStart(repo, 'hotfix', 'critical')
    // hotfix branched off main, not develop
    expect(isAncestor('main', 'hotfix/critical')).toBe(true)
    commit('fix.txt', 'patch\n')
    await gitflowFinish(repo, 'hotfix')

    // settles on develop, like git-flow
    expect(git('rev-parse', '--abbrev-ref', 'HEAD').trim()).toBe('develop')
    expect(hasFile('main', 'fix.txt')).toBe(true)
    expect(hasFile('develop', 'fix.txt')).toBe(true)
  })

  it('start without develop errors for feature, works for hotfix', async () => {
    await expect(gitflowStart(repo, 'feature', 'x')).rejects.toThrow(/develop/)
    await gitflowStart(repo, 'hotfix', 'y') // hotfix bases on main
    expect(git('rev-parse', '--abbrev-ref', 'HEAD').trim()).toBe('hotfix/y')
  })

  it('start rejects duplicate branch names', async () => {
    await gitflowInit(repo)
    await gitflowStart(repo, 'feature', 'dup')
    git('checkout', 'develop')
    await expect(gitflowStart(repo, 'feature', 'dup')).rejects.toThrow(/already exists/)
  })

  it('finish refuses when HEAD is not a branch of that kind', async () => {
    await gitflowInit(repo)
    await expect(gitflowFinish(repo, 'feature')).rejects.toThrow(/not a feature/)
    await gitflowStart(repo, 'release', 'r1')
    await expect(gitflowFinish(repo, 'hotfix')).rejects.toThrow(/not a hotfix/)
  })
})
