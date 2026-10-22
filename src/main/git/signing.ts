import { spawn } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { execGit } from './exec'

export type SigningFormat = 'openpgp' | 'ssh' | 'x509'

export interface SshPublicKey {
  /** Path to the .pub file. */
  path: string
  /** Trailing comment field of the key, when present. */
  comment: string
}

export interface SigningStatus {
  /** Whether this repo signs commits (repo-level commit.gpgsign). */
  signCommits: boolean
  /** git config gpg.format; empty = git default (openpgp). */
  format: SigningFormat | ''
  /** git config user.signingkey. */
  signingKey: string
  /** `gpg` binary is on PATH. */
  gpgInstalled: boolean
  /** OpenSSH is available for ssh signing. */
  sshAvailable: boolean
  /** *.pub files in ~/.ssh (or GIT_GUI_SSH_DIR), for the ssh key picker. */
  sshPublicKeys: SshPublicKey[]
}

async function gitConfig(repoPath: string, key: string): Promise<string> {
  const result = await execGit({ cwd: repoPath, args: ['config', '--get', key] })
  return result.code === 0 ? result.stdout.trim() : ''
}

function probeBinary(bin: string, versionArgs: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(bin, versionArgs, { stdio: 'ignore', windowsHide: true })
    child.on('error', () => resolve(false))
    child.on('exit', (code) => resolve(code === 0))
  })
}

async function listSshPublicKeys(): Promise<SshPublicKey[]> {
  const dir = process.env.GIT_GUI_SSH_DIR || join(homedir(), '.ssh')
  try {
    const files = await readdir(dir)
    const keys: SshPublicKey[] = []
    for (const f of files.filter((x) => x.endsWith('.pub')).sort()) {
      // comment = last whitespace-separated field, when the line has one
      const raw = await readFile(join(dir, f), 'utf8').catch(() => '')
      const fields = raw.trim().split(/\s+/)
      // ssh-ed25519/ssh-rsa <base64> [comment...] → comment starts at field 2
      const comment = fields.length >= 3 ? fields.slice(2).join(' ') : ''
      keys.push({ path: join(dir, f), comment })
    }
    return keys
  } catch {
    return []
  }
}

/** Read signing state for one repo + host tool availability. */
export async function signingStatus(repoPath: string): Promise<SigningStatus> {
  const [signCommits, format, signingKey, gpgInstalled, sshAvailable, sshPublicKeys] =
    await Promise.all([
      gitConfig(repoPath, 'commit.gpgsign').then((v) => v === 'true'),
      gitConfig(repoPath, 'gpg.format'),
      gitConfig(repoPath, 'user.signingkey'),
      probeBinary('gpg', ['--version']),
      probeBinary('ssh', ['-V']),
      listSshPublicKeys()
    ])
  return {
    signCommits,
    format: format as SigningFormat | '',
    signingKey,
    gpgInstalled,
    sshAvailable,
    sshPublicKeys
  }
}

export interface SigningPatch {
  signCommits?: boolean
  format?: SigningFormat
  /** Pass empty string to unset user.signingkey. */
  signingKey?: string
}

/**
 * Apply signing config at repo level (never touches ~/.gitconfig).
 * Empty values unset the key so the repo falls back to git defaults.
 */
export async function setSigning(repoPath: string, patch: SigningPatch): Promise<void> {
  if (patch.signCommits !== undefined) {
    await execGit({
      cwd: repoPath,
      args: ['config', 'commit.gpgsign', patch.signCommits ? 'true' : 'false']
    })
  }
  if (patch.format !== undefined) {
    await execGit({ cwd: repoPath, args: ['config', 'gpg.format', patch.format] })
  }
  if (patch.signingKey !== undefined) {
    const key = patch.signingKey.trim()
    if (key === '') {
      await execGit({ cwd: repoPath, args: ['config', '--unset', 'user.signingkey'] })
    } else {
      await execGit({ cwd: repoPath, args: ['config', 'user.signingkey', key] })
    }
  }
}
