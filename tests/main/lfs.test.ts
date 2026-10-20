import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isLfsInstalled, lfsStatus, setLfsFetchPolicy } from '@main/git/lfs'

const env = {
  ...process.env,
  LC_ALL: 'C',
  GIT_AUTHOR_NAME: 'T',
  GIT_AUTHOR_EMAIL: 't@e.com',
  GIT_COMMITTER_NAME: 'T',
  GIT_COMMITTER_EMAIL: 't@e.com'
}

describe('lfs module', () => {
  let repo: string

  const git = (...args: string[]): string =>
    execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', env })

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'gitgui-lfs-'))
    execFileSync('git', ['init', '-q', '-b', 'main', repo], { env })
    git('config', 'user.name', 'T')
    git('config', 'user.email', 't@e.com')
    writeFileSync(join(repo, 'file.txt'), 'v1\n')
    git('add', 'file.txt')
    git('commit', '-q', '-m', 'initial')
  })

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true })
  })

  it('isLfsInstalled matches the local environment without throwing', async () => {
    // The runner may or may not have git-lfs — the probe must answer either way.
    const installed = await isLfsInstalled()
    expect(typeof installed).toBe('boolean')
  })

  it('reports a non-LFS repo: isLfsRepo=false, trackedFiles=0', async () => {
    const s = await lfsStatus(repo)
    expect(s.isLfsRepo).toBe(false)
    expect(s.trackedFiles).toBe(0)
    expect(s.fetchInclude).toBe('')
    expect(s.fetchExclude).toBe('')
  })

  it('detects filter=lfs in a tracked .gitattributes', async () => {
    writeFileSync(join(repo, '.gitattributes'), '*.psd filter=lfs diff=lfs merge=lfs -text\n')
    git('add', '.gitattributes')
    git('commit', '-q', '-m', 'add attributes')

    const s = await lfsStatus(repo)
    expect(s.isLfsRepo).toBe(true)
    // without the lfs binary there is nothing for ls-files to report
    expect(s.trackedFiles).toBe(0)
  })

  it('detects a nested .gitattributes', async () => {
    mkdirSync(join(repo, 'assets'))
    writeFileSync(join(repo, 'assets', '.gitattributes'), '*.png filter=lfs\n')
    git('add', 'assets/.gitattributes')
    git('commit', '-q', '-m', 'nested attributes')

    const s = await lfsStatus(repo)
    expect(s.isLfsRepo).toBe(true)
  })

  it('setLfsFetchPolicy writes and clears lfs.fetchinclude/exclude', async () => {
    await setLfsFetchPolicy(repo, { fetchInclude: '*.psd,*.zip', fetchExclude: '*.max' })
    let s = await lfsStatus(repo)
    expect(s.fetchInclude).toBe('*.psd,*.zip')
    expect(s.fetchExclude).toBe('*.max')

    // empty string unsets the keys entirely
    await setLfsFetchPolicy(repo, { fetchInclude: '', fetchExclude: '' })
    s = await lfsStatus(repo)
    expect(s.fetchInclude).toBe('')
    expect(s.fetchExclude).toBe('')
    let unset = false
    try {
      git('config', '--get', 'lfs.fetchinclude')
    } catch {
      unset = true // exit 1 = key absent
    }
    expect(unset).toBe(true)
  })

  it('setLfsFetchPolicy leaves unspecified keys untouched', async () => {
    await setLfsFetchPolicy(repo, { fetchInclude: 'keep-me' })
    await setLfsFetchPolicy(repo, { fetchExclude: 'only-exclude' })
    const s = await lfsStatus(repo)
    expect(s.fetchInclude).toBe('keep-me')
    expect(s.fetchExclude).toBe('only-exclude')
  })
})
