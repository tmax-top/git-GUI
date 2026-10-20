import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanOrigFiles, getRepoSettings, repoEncoding, setRepoSettings } from '@main/git/repoConfig'
import { getDiffText } from '@main/git/diff'

const env = {
  ...process.env,
  LC_ALL: 'C',
  GIT_AUTHOR_NAME: 'T',
  GIT_AUTHOR_EMAIL: 't@e.com',
  GIT_COMMITTER_NAME: 'T',
  GIT_COMMITTER_EMAIL: 't@e.com'
}

describe('repo-level settings', () => {
  let repo: string

  const git = (...args: string[]): string =>
    execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', env }).trim()

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'gitgui-reposettings-'))
    execFileSync('git', ['init', '-q', '-b', 'main', repo], { env })
    git('config', 'user.name', 'T')
    git('config', 'user.email', 't@e.com')
  })

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true })
  })

  it('defaults: utf-8, detected default branch, no orig files', async () => {
    const s = await getRepoSettings(repo)
    expect(s.encoding).toBe('utf-8')
    expect(s.defaultBranch).toBe('main')
    expect(s.origFiles).toEqual([])
  })

  it('setRepoSettings persists encoding + default branch in repo config', async () => {
    const s = await setRepoSettings(repo, { encoding: 'GBK', defaultBranch: 'master' })
    expect(s.encoding).toBe('gbk')
    expect(s.defaultBranch).toBe('master')
    expect(git('config', '--get', 'git-gui.encoding')).toBe('gbk')
    expect(git('config', '--get', 'init.defaultBranch')).toBe('master')
  })

  it('rejects unsupported encodings and invalid branch names', async () => {
    await expect(setRepoSettings(repo, { encoding: 'klingon' })).rejects.toThrow(
      /unsupported encoding/
    )
    await expect(setRepoSettings(repo, { defaultBranch: 'bad name' })).rejects.toThrow(
      /invalid branch name/
    )
    await expect(setRepoSettings(repo, { defaultBranch: 'a..b' })).rejects.toThrow(
      /invalid branch name/
    )
  })

  it('invalid stored encoding falls back to utf-8', async () => {
    git('config', 'git-gui.encoding', 'nonsense')
    expect(await repoEncoding(repo)).toBe('utf-8')
  })

  it('lists and cleans .orig leftovers (tracked + untracked)', async () => {
    writeFileSync(join(repo, 'keep.txt'), 'x')
    git('add', '-f', 'keep.txt')
    git('commit', '-m', 'init')

    writeFileSync(join(repo, 'file.orig'), 'backup')
    writeFileSync(join(repo, 'other.orig'), 'backup')
    writeFileSync(join(repo, 'keep.txt'), 'changed')
    git('add', 'keep.txt')
    writeFileSync(join(repo, 'keep.orig'), 'backup') // staged state keeps it listed

    const before = await getRepoSettings(repo)
    expect(before.origFiles).toEqual(['file.orig', 'keep.orig', 'other.orig'])

    const removed = await cleanOrigFiles(repo)
    expect(removed).toEqual(['file.orig', 'keep.orig', 'other.orig'])

    const after = await getRepoSettings(repo)
    expect(after.origFiles).toEqual([])
  })

  it('GBK diff content decodes back to readable text when encoding is set', async () => {
    writeFileSync(join(repo, 'a.txt'), Buffer.from([0x68, 0x69, 0x0a])) // "hi\n"
    git('add', '-f', 'a.txt')
    git('commit', '-m', 'init')

    // new content is GBK-encoded bytes (as a legacy Windows repo would have):
    // 中=D6D0 文=CEC4 测=B2E2 试=CAD4 \n=0A
    const gbk = Buffer.from([0xd6, 0xd0, 0xce, 0xc4, 0xb2, 0xe2, 0xca, 0xd4, 0x0a])
    writeFileSync(join(repo, 'a.txt'), gbk)

    const utf8Diff = await getDiffText(repo)
    expect(utf8Diff).not.toContain('中文测试') // wrong decode → unreadable

    const gbkDiff = await getDiffText(repo, { encoding: 'gbk' })
    expect(gbkDiff).toContain('+中文测试')
  })
})
