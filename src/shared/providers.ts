export type ProviderKind = 'github' | 'azuredevops'

export interface RepoRef {
  provider: ProviderKind
  /** GitHub organization or user account. */
  owner?: string
  /** Azure DevOps organization. */
  org?: string
  /** Azure DevOps project. */
  project?: string
  /** Repository name. */
  repo: string
  /** Canonical identity e.g. "github.com/owner/repo" or "dev.azure.com/org/project/_git/repo" */
  canonical: string
  /** Original remote or clone URL parsed. */
  originalUrl: string
}

export interface ProviderAccountDto {
  provider: ProviderKind
  username: string
  displayName?: string
  avatarUrl?: string
  authType: 'pat' | 'device-flow'
  createdAt: string
  org?: string
}

export interface RemoteRepoDto {
  id: string
  name: string
  fullName: string
  cloneUrl: string
  sshUrl?: string
  defaultBranch?: string
  isPrivate?: boolean
  description?: string
  project?: string
}

export type PrState = 'open' | 'closed' | 'merged'
export type PrMergeMethod = 'merge' | 'squash' | 'rebase'

export interface PullRequestDto {
  id: string | number
  number: number
  title: string
  state: PrState
  author: { name: string; avatarUrl?: string }
  sourceBranch: string
  targetBranch: string
  createdAt: string
  updatedAt: string
  url: string
  draft?: boolean
}

export interface PrCommentDto {
  id: string | number
  author: { name: string; avatarUrl?: string }
  body: string
  createdAt: string
}

export interface PullRequestDetailDto extends PullRequestDto {
  description: string
  diff: string
  comments: PrCommentDto[]
  mergeable?: boolean
}

export interface CreatePrInputDto {
  title: string
  description: string
  sourceBranch: string
  targetBranch: string
  draft?: boolean
}

/**
 * Parse a Git remote URL or clone URL into a recognized RepoRef (GitHub or Azure DevOps).
 * Returns null if the URL is not a recognized provider.
 */
export function parseRepoRef(rawUrl: string): RepoRef | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null
  const trimmed = rawUrl.trim()
  if (!trimmed) return null

  // 1. GitHub
  // https://github.com/owner/repo(.git)
  // ssh://git@github.com/owner/repo(.git)
  const ghHttp = /^(?:https?|ssh):\/\/(?:[^@]+@)?github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i.exec(trimmed)
  if (ghHttp) {
    const owner = ghHttp[1]
    const repo = ghHttp[2].replace(/\.git$/i, '')
    return {
      provider: 'github',
      owner,
      repo,
      canonical: `github.com/${owner}/${repo}`,
      originalUrl: trimmed
    }
  }

  // git@github.com:owner/repo(.git)
  const ghScp = /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?\/?$/i.exec(trimmed)
  if (ghScp) {
    const owner = ghScp[1]
    const repo = ghScp[2].replace(/\.git$/i, '')
    return {
      provider: 'github',
      owner,
      repo,
      canonical: `github.com/${owner}/${repo}`,
      originalUrl: trimmed
    }
  }

  // 2. Azure DevOps
  // https://dev.azure.com/{org}/{project}/_git/{repo}
  const adoHttp =
    /^(?:https?|ssh):\/\/(?:[^@]+@)?dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/([^/]+?)(?:\.git)?\/?$/i.exec(
      trimmed
    )
  if (adoHttp) {
    const org = adoHttp[1]
    const project = adoHttp[2]
    const repo = adoHttp[3].replace(/\.git$/i, '')
    return {
      provider: 'azuredevops',
      org,
      project,
      repo,
      canonical: `dev.azure.com/${org}/${project}/_git/${repo}`,
      originalUrl: trimmed
    }
  }

  // https://{org}.visualstudio.com/{project}/_git/{repo} (or /DefaultCollection/{project}/_git/{repo})
  const vsHttp =
    /^(?:https?|ssh):\/\/(?:[^@]+@)?([^.]+)\.visualstudio\.com\/(?:DefaultCollection\/)?([^/]+)\/_git\/([^/]+?)(?:\.git)?\/?$/i.exec(
      trimmed
    )
  if (vsHttp) {
    const org = vsHttp[1]
    const project = vsHttp[2]
    const repo = vsHttp[3].replace(/\.git$/i, '')
    return {
      provider: 'azuredevops',
      org,
      project,
      repo,
      canonical: `dev.azure.com/${org}/${project}/_git/${repo}`,
      originalUrl: trimmed
    }
  }

  // git@ssh.dev.azure.com:v3/{org}/{project}/{repo}
  // ssh://git@ssh.dev.azure.com:v3/{org}/{project}/{repo}
  const adoSsh =
    /^(?:ssh:\/\/)?git@ssh\.dev\.azure\.com:v3\/([^/]+)\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i.exec(trimmed)
  if (adoSsh) {
    const org = adoSsh[1]
    const project = adoSsh[2]
    const repo = adoSsh[3].replace(/\.git$/i, '')
    return {
      provider: 'azuredevops',
      org,
      project,
      repo,
      canonical: `dev.azure.com/${org}/${project}/_git/${repo}`,
      originalUrl: trimmed
    }
  }

  return null
}
