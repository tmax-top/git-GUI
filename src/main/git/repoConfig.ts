import { rm, stat } from 'node:fs/promises'
import { join, sep } from 'node:path'
import { execGit, execGitOrThrow } from './exec'

/** Encoding labels accepted for worktree/diff decoding (WHATWG names). */
export const SUPPORTED_ENCODINGS = ['utf-8', 'gbk', 'gb18030', 'big5', 'shift_jis', 'euc-kr']

export interface RepoSettingsDto {
  /** Worktree/diff decoding encoding. */
  encoding: string
  /** The branch treated as this repo's default line (config init.defaultBranch). */
  defaultBranch: string
  /** Untracked/tracked *.orig leftovers in the worktree. */
  origFiles: string[]
}

async function config(repoPath: string, key: string): Promise<string> {
  const result = await execGit({ cwd: repoPath, args: ['config', '--get', key] })
  return result.code === 0 ? result.stdout.trim() : ''
}

/** Fast single-read of the diff/worktree encoding (no branch/orig scans). */
export async function repoEncoding(repoPath: string): Promise<string> {
  const value = await config(repoPath, 'git-gui.encoding')
  return value && SUPPORTED_ENCODINGS.includes(value) ? value : 'utf-8'
}

/** Detect the repo's default line: app key → git key → main/master → HEAD. */
async function detectDefaultBranch(repoPath: string): Promise<string> {
  for (const key of ['git-gui.defaultBranch', 'init.defaultBranch']) {
    const value = await config(repoPath, key)
    if (value) return value
  }
  for (const name of ['main', 'master']) {
    const r = await execGit({ cwd: repoPath, args: ['rev-parse', '--verify', '--quiet', name] })
    if (r.code === 0) return name
  }
  const head = await execGit({
    cwd: repoPath,
    args: ['symbolic-ref', '--quiet', '--short', 'HEAD']
  })
  return head.code === 0 ? head.stdout.trim() : 'main'
}

/** List *.orig files (tracked or untracked) inside the worktree, relative paths. */
async function listOrigFiles(repoPath: string): Promise<string[]> {
  const [tracked, untracked] = await Promise.all([
    execGit({ cwd: repoPath, args: ['ls-files', '-z'] }),
    execGit({ cwd: repoPath, args: ['ls-files', '-o', '--exclude-standard', '-z'] })
  ])
  const names = `${tracked.stdout}${untracked.stdout}`.split('\0').filter(Boolean)
  return [...new Set(names.filter((n) => n.endsWith('.orig')))].sort()
}

export async function getRepoSettings(repoPath: string): Promise<RepoSettingsDto> {
  const [encoding, defaultBranch, origFiles] = await Promise.all([
    config(repoPath, 'git-gui.encoding'),
    detectDefaultBranch(repoPath),
    listOrigFiles(repoPath)
  ])
  return {
    encoding: encoding && SUPPORTED_ENCODINGS.includes(encoding) ? encoding : 'utf-8',
    defaultBranch,
    origFiles
  }
}

export interface RepoSettingsPatch {
  encoding?: string
  defaultBranch?: string
}

export async function setRepoSettings(
  repoPath: string,
  patch: RepoSettingsPatch
): Promise<RepoSettingsDto> {
  if (patch.encoding != null) {
    const enc = patch.encoding.trim().toLowerCase()
    if (!SUPPORTED_ENCODINGS.includes(enc)) {
      throw new Error(`unsupported encoding: ${patch.encoding}`)
    }
    await execGitOrThrow({ cwd: repoPath, args: ['config', 'git-gui.encoding', enc] })
  }
  if (patch.defaultBranch != null) {
    const branch = patch.defaultBranch.trim()
    if (branch === '') throw new Error('default branch must not be empty')
    if (branch.includes('..') || /[\s~^:?*[\\]/.test(branch) || branch.startsWith('-')) {
      throw new Error(`invalid branch name: ${branch}`)
    }
    // both: git's own key (new inits) and the app's key (displayed value)
    await execGitOrThrow({ cwd: repoPath, args: ['config', 'init.defaultBranch', branch] })
    await execGitOrThrow({ cwd: repoPath, args: ['config', 'git-gui.defaultBranch', branch] })
  }
  return getRepoSettings(repoPath)
}

/** Delete every *.orig file in the worktree (path-escape safe). Returns removed paths. */
export async function cleanOrigFiles(repoPath: string): Promise<string[]> {
  const files = await listOrigFiles(repoPath)
  const removed: string[] = []
  for (const rel of files) {
    const abs = join(repoPath, rel)
    if (!abs.startsWith(repoPath + sep)) continue
    try {
      await stat(abs)
    } catch {
      continue
    }
    await rm(abs, { force: true })
    removed.push(rel)
  }
  return removed
}
