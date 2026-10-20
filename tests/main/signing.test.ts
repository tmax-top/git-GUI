import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setSigning, signingStatus } from '@main/git/signing'

const env = {
  ...process.env,
  LC_ALL: 'C',
  GIT_AUTHOR_NAME: 'T',
  GIT_AUTHOR_EMAIL: 't@e.com',
  GIT_COMMITTER_NAME: 'T',
  GIT_COMMITTER_EMAIL: 't@e.com'
}

describe('commit signing (repo-level config)', () => {
  let repo: string
  let sshDir: string
  let prevSshDir: string | undefined

  const git = (...args: string[]): string =>
    execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', env }).trim()

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'gitgui-signing-'))
    execFileSync('git', ['init', '-q', '-b', 'main', repo], { env })
    git('config', 'user.name', 'T')
    git('config', 'user.email', 't@e.com')
    // fake ~/.ssh with two public keys and a private key that must be ignored
    sshDir = mkdtempSync(join(tmpdir(), 'gitgui-ssh-'))
    writeFileSync(
      join(sshDir, 'id_ed25519.pub'),
      'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITestKeyData test@host\n'
    )
    writeFileSync(
      join(sshDir, 'work_rsa.pub'),
      'ssh-rsa AAAAB3NzaC1yc2EAAAITestKeyData work@corp\n'
    )
    writeFileSync(join(sshDir, 'id_ed25519'), 'PRIVATE KEY MATERIAL\n')
    prevSshDir = process.env.GIT_GUI_SSH_DIR
    process.env.GIT_GUI_SSH_DIR = sshDir
  })

  afterEach(() => {
    if (prevSshDir === undefined) delete process.env.GIT_GUI_SSH_DIR
    else process.env.GIT_GUI_SSH_DIR = prevSshDir
    rmSync(repo, { recursive: true, force: true })
    rmSync(sshDir, { recursive: true, force: true })
  })

  it('defaults: signing off, empty format/key, tool probes are booleans', async () => {
    const s = await signingStatus(repo)
    expect(s.signCommits).toBe(false)
    expect(s.format).toBe('')
    expect(s.signingKey).toBe('')
    expect(typeof s.gpgInstalled).toBe('boolean')
    expect(typeof s.sshAvailable).toBe('boolean')
  })

  it('lists only .pub files with their trailing comment', async () => {
    const s = await signingStatus(repo)
    expect(s.sshPublicKeys.map((k) => k.path.split('/').pop())).toEqual([
      'id_ed25519.pub',
      'work_rsa.pub'
    ])
    expect(s.sshPublicKeys[0]?.comment).toBe('test@host')
    expect(s.sshPublicKeys[1]?.comment).toBe('work@corp')
  })

  it('setSigning writes ssh format + key + commit.gpgsign', async () => {
    await setSigning(repo, {
      signCommits: true,
      format: 'ssh',
      signingKey: join(sshDir, 'id_ed25519.pub')
    })
    const s = await signingStatus(repo)
    expect(s.signCommits).toBe(true)
    expect(s.format).toBe('ssh')
    expect(s.signingKey).toBe(join(sshDir, 'id_ed25519.pub'))

    // repo-level only — nothing leaked into the global config
    expect(git('config', '--get', 'commit.gpgsign')).toBe('true')
  })

  it('setSigning can turn signing off and unset the key', async () => {
    await setSigning(repo, { signCommits: true, format: 'openpgp', signingKey: 'ABCDEF123' })
    await setSigning(repo, { signCommits: false, signingKey: '' })

    const s = await signingStatus(repo)
    expect(s.signCommits).toBe(false)
    expect(s.signingKey).toBe('')
    // format is sticky by design (git behaves the same way)
    expect(s.format).toBe('openpgp')
  })

  it('setSigning leaves unspecified fields untouched', async () => {
    await setSigning(repo, { format: 'ssh', signingKey: 'k1' })
    await setSigning(repo, { signCommits: true })
    const s = await signingStatus(repo)
    expect(s).toMatchObject({ signCommits: true, format: 'ssh', signingKey: 'k1' })
  })
})
