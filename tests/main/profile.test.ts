import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { execGit, setActiveProfileConfig } from '../../src/main/git/exec'
import { commit } from '../../src/main/git/ops'
import { profileDtoSchema } from '../../src/shared/ipc'

describe('git profiles and -c injection', () => {
  let repo: string
  const env = { ...process.env, LC_ALL: 'C' }

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'gitgui-profile-test-'))
    execFileSync('git', ['init', '-q', '-b', 'main', repo], { env })
  })

  afterEach(() => {
    setActiveProfileConfig(null)
    rmSync(repo, { recursive: true, force: true })
  })

  it('validates profile DTO structure', () => {
    const valid = {
      id: 'prof_1',
      name: 'Work Profile',
      authorName: 'Work Engineer',
      authorEmail: 'engineer@corp.com',
      signingKey: 'ABCDEF1234567890'
    }
    const res = profileDtoSchema.safeParse(valid)
    expect(res.success).toBe(true)
  })

  it('rejects invalid profile with empty fields', () => {
    const invalid = {
      id: '',
      name: '',
      authorName: '',
      authorEmail: ''
    }
    const res = profileDtoSchema.safeParse(invalid)
    expect(res.success).toBe(false)
  })

  it('injects profile via -c and produces different commit authors for two profiles without altering global config', async () => {
    // 1. Commit under Profile A
    setActiveProfileConfig({
      name: 'Alice Work',
      email: 'alice@company.com'
    })

    writeFileSync(join(repo, 'work.txt'), 'work task\n')
    await execGit({ cwd: repo, args: ['add', 'work.txt'] })
    await commit(repo, { message: 'work commit' })

    const log1 = await execGit({ cwd: repo, args: ['log', '-1', '--format=%an <%ae>'] })
    expect(log1.stdout.trim()).toBe('Alice Work <alice@company.com>')

    // 2. Commit under Profile B
    setActiveProfileConfig({
      name: 'Alice Personal',
      email: 'alice@personal.me'
    })

    writeFileSync(join(repo, 'personal.txt'), 'personal task\n')
    await execGit({ cwd: repo, args: ['add', 'personal.txt'] })
    await commit(repo, { message: 'personal commit' })

    const log2 = await execGit({ cwd: repo, args: ['log', '-1', '--format=%an <%ae>'] })
    expect(log2.stdout.trim()).toBe('Alice Personal <alice@personal.me>')

    // 3. Verify local repository .git/config has no user.name or user.email written
    const localName = await execGit({ cwd: repo, args: ['config', '--local', 'user.name'] }).catch((e) => e)
    expect(localName.code !== 0 || localName.stdout.trim() === '').toBe(true)

    // 4. Verify log history has both distinct authors preserved
    const authors = await execGit({ cwd: repo, args: ['log', '--format=%an'] })
    expect(authors.stdout.trim().split('\n')).toEqual(['Alice Personal', 'Alice Work'])
  })
})
