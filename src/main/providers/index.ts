import { execGit } from '../git/exec'
import { deleteSecret, getSecret, setSecret } from '../secrets'
import { loadSettings, updateSettings } from '../settings'
import { parseRepoRef, type CreatePrInputDto, type PrMergeMethod, type ProviderAccountDto, type ProviderKind, type PullRequestDetailDto, type PullRequestDto, type RepoRef, type PrState } from '../../shared/providers'
import { AzureDevOpsProvider } from './azuredevops'
import { GitHubProvider } from './github'
import type { GitProvider } from './provider'

const providers: Record<ProviderKind, GitProvider> = {
  github: new GitHubProvider(),
  azuredevops: new AzureDevOpsProvider()
}

/** Detect the RepoRef of the current repository by inspecting `git remote -v`. */
export async function detectRepoRef(repoPath: string): Promise<RepoRef | null> {
  try {
    const res = await execGit({ cwd: repoPath, args: ['remote', '-v'] })
    const lines = res.stdout.split('\n')
    let originUrl = ''
    let anyUrl = ''
    for (const line of lines) {
      const match = /^(\S+)\s+(\S+)\s+\((fetch|push)\)$/.exec(line.trim())
      if (match) {
        const [, remoteName, url, direction] = match
        if (remoteName === 'origin' && direction === 'fetch') {
          originUrl = url
          break
        }
        if (!anyUrl && direction === 'fetch') {
          anyUrl = url
        }
      }
    }
    const targetUrl = originUrl || anyUrl
    if (!targetUrl) return null
    return parseRepoRef(targetUrl)
  } catch {
    return null
  }
}

export async function listProviderAccounts(): Promise<ProviderAccountDto[]> {
  const settings = await loadSettings()
  return settings.providerAccounts ?? []
}

export async function connectPat(args: {
  provider: ProviderKind
  token: string
  org?: string
}): Promise<ProviderAccountDto> {
  const p = providers[args.provider]
  if (!p) throw new Error(`未知的 Provider: ${args.provider}`)

  // Validate credentials by authenticating with the provider
  const account = await p.authenticatePat(args.token, { org: args.org })

  // Securely store token in safeStorage / encrypted secrets store
  await setSecret(`provider:${args.provider}`, args.token)

  // Persist account metadata in settings (no secrets in settings)
  const settings = await loadSettings()
  const existing = (settings.providerAccounts ?? []).filter((a) => a.provider !== args.provider)
  await updateSettings({ providerAccounts: [...existing, account] })

  return account
}

export async function disconnectProvider(provider: ProviderKind): Promise<void> {
  await deleteSecret(`provider:${provider}`)
  const settings = await loadSettings()
  const filtered = (settings.providerAccounts ?? []).filter((a) => a.provider !== provider)
  await updateSettings({ providerAccounts: filtered })
}

async function getProviderForRepo(
  repoPathOrRef: string | RepoRef
): Promise<{ provider: GitProvider; ref: RepoRef; token: string }> {
  let ref: RepoRef | null
  if (typeof repoPathOrRef === 'string') {
    ref = await detectRepoRef(repoPathOrRef)
  } else {
    ref = repoPathOrRef
  }

  if (!ref) {
    throw new Error('当前仓库未检测到支持的远程提供商（GitHub 或 Azure DevOps）')
  }

  const token = await getSecret(`provider:${ref.provider}`)
  if (!token) {
    const label = ref.provider === 'github' ? 'GitHub' : 'Azure DevOps'
    throw new Error(`未连接 ${label} 账号，请在设置中配置个人访问令牌（PAT）`)
  }

  const p = providers[ref.provider]
  return { provider: p, ref, token }
}

export async function listPullRequests(
  repoPathOrRef: string | RepoRef,
  state: PrState | 'all' = 'open'
): Promise<PullRequestDto[]> {
  const { provider, ref, token } = await getProviderForRepo(repoPathOrRef)
  return provider.listPullRequests(ref, token, state)
}

export async function getPullRequest(
  repoPathOrRef: string | RepoRef,
  id: number | string
): Promise<PullRequestDetailDto> {
  const { provider, ref, token } = await getProviderForRepo(repoPathOrRef)
  return provider.getPullRequest(ref, token, id)
}

export async function createPullRequest(
  repoPathOrRef: string | RepoRef,
  input: CreatePrInputDto
): Promise<PullRequestDto> {
  const { provider, ref, token } = await getProviderForRepo(repoPathOrRef)
  return provider.createPullRequest(ref, token, input)
}

export async function commentOnPullRequest(
  repoPathOrRef: string | RepoRef,
  id: number | string,
  body: string
): Promise<void> {
  const { provider, ref, token } = await getProviderForRepo(repoPathOrRef)
  return provider.commentOnPullRequest(ref, token, id, body)
}

export async function mergePullRequest(
  repoPathOrRef: string | RepoRef,
  id: number | string,
  method: PrMergeMethod
): Promise<void> {
  const { provider, ref, token } = await getProviderForRepo(repoPathOrRef)
  return provider.mergePullRequest(ref, token, id, method)
}

export async function checkoutPrBranch(repoPath: string, branch: string): Promise<void> {
  // Try direct checkout first
  try {
    await execGit({ cwd: repoPath, args: ['checkout', branch] })
    return
  } catch {
    /* try creating local tracking branch */
  }

  try {
    await execGit({ cwd: repoPath, args: ['fetch', 'origin', branch] })
    await execGit({ cwd: repoPath, args: ['checkout', '-b', branch, `origin/${branch}`] })
  } catch {
    // Fallback: standard checkout
    await execGit({ cwd: repoPath, args: ['checkout', branch] })
  }
}
