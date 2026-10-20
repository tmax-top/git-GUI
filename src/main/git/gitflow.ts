import { execGit, execGitOrThrow } from './exec'
import { repoQueue } from './queue'

export type GitflowKind = 'feature' | 'release' | 'hotfix'

export interface GitflowStatus {
  /** Branch gitflow treats as the production line (main, or master). */
  mainBranch: string
  /** The develop integration branch. */
  developBranch: string
  developExists: boolean
  /** Current checked-out branch, when on one. */
  currentBranch?: string
  /** Set when the current branch follows the kind/{name} convention. */
  currentKind?: GitflowKind
}

const KINDS: GitflowKind[] = ['feature', 'release', 'hotfix']

function parseKind(branch: string | undefined): GitflowKind | undefined {
  if (!branch) return undefined
  const prefix = branch.split('/')[0]
  return KINDS.find((k) => k === prefix)
}

async function branchExists(repoPath: string, name: string): Promise<boolean> {
  const result = await execGit({
    cwd: repoPath,
    args: ['show-ref', '--verify', '--quiet', `refs/heads/${name}`]
  })
  return result.code === 0
}

async function currentBranchName(repoPath: string): Promise<string | undefined> {
  const result = await execGit({
    cwd: repoPath,
    args: ['symbolic-ref', '--quiet', '--short', 'HEAD']
  })
  return result.code === 0 ? result.stdout.trim() || undefined : undefined
}

/** Detect main/develop lines and the gitflow role of the current branch. */
export async function gitflowStatus(repoPath: string): Promise<GitflowStatus> {
  const mainBranch = (await branchExists(repoPath, 'main')) ? 'main' : 'master'
  const developExists = await branchExists(repoPath, 'develop')
  const currentBranch = await currentBranchName(repoPath)
  return {
    mainBranch,
    developBranch: 'develop',
    developExists,
    currentBranch,
    currentKind: parseKind(currentBranch)
  }
}

/**
 * Initialize gitflow: create `develop` off the main line (idempotent).
 * Uses plain git — no git-flow CLI required.
 */
export async function gitflowInit(repoPath: string): Promise<void> {
  const status = await gitflowStatus(repoPath)
  if (status.developExists) return
  await repoQueue.run(repoPath, () =>
    execGitOrThrow({
      cwd: repoPath,
      args: ['checkout', '-b', 'develop', status.mainBranch]
    })
  )
}

/**
 * Start a gitflow branch: `feature/x`, `release/x`, `hotfix/x`.
 * feature/release branch off develop; hotfix branches off the main line.
 * Plain git: no prefix enforcement beyond ours.
 */
export async function gitflowStart(
  repoPath: string,
  kind: GitflowKind,
  name: string
): Promise<void> {
  const status = await gitflowStatus(repoPath)
  const base = kind === 'hotfix' ? status.mainBranch : status.developBranch
  if (!(await branchExists(repoPath, base))) {
    throw new Error(`gitflow base branch missing: ${base} (run gitflow init first)`)
  }
  const full = `${kind}/${name}`
  if (await branchExists(repoPath, full)) throw new Error(`branch already exists: ${full}`)
  await repoQueue.run(repoPath, () =>
    execGitOrThrow({ cwd: repoPath, args: ['checkout', '-b', full, base] })
  )
}

/**
 * Finish a gitflow branch: merge --no-ff back into its target line(s) and
 * delete the branch. feature → develop; release → develop + main;
 * hotfix → main + develop.
 */
export async function gitflowFinish(repoPath: string, kind: GitflowKind): Promise<void> {
  const status = await gitflowStatus(repoPath)
  const branch = await currentBranchName(repoPath)
  if (!branch) throw new Error('not on a branch')
  if (parseKind(branch) !== kind) {
    throw new Error(`current branch ${branch} is not a ${kind}/* branch`)
  }

  const targets =
    kind === 'feature'
      ? [status.developBranch]
      : [status.developBranch, status.mainBranch]
  for (const target of targets) {
    if (!(await branchExists(repoPath, target))) {
      throw new Error(`target branch missing: ${target}`)
    }
  }

  // Merge into each target line, delete the flow branch (from the last
  // target's checkout, where `branch -d` can verify the merge landed), then
  // settle on the integration line — matching git-flow's user-visible result.
  await repoQueue.run(repoPath, async () => {
    for (const target of targets) {
      await execGitOrThrow({ cwd: repoPath, args: ['checkout', target] })
      await execGitOrThrow({ cwd: repoPath, args: ['merge', '--no-ff', branch] })
    }
    await execGitOrThrow({ cwd: repoPath, args: ['branch', '-d', branch] })
    await execGitOrThrow({ cwd: repoPath, args: ['checkout', targets[0]!] })
  })
}
