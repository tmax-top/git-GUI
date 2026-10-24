import type {
  CreatePrInputDto,
  PrCommentDto,
  PrMergeMethod,
  ProviderAccountDto,
  PullRequestDetailDto,
  PullRequestDto,
  RemoteRepoDto,
  RepoRef,
  PrState
} from '../../shared/providers'
import type { GitProvider } from './provider'

interface GhUser {
  login: string
  name?: string
  avatar_url?: string
}

interface GhPr {
  id: number
  number: number
  title: string
  state: string
  merged_at?: string | null
  user?: GhUser
  head?: { ref: string }
  base?: { ref: string }
  body?: string
  created_at: string
  updated_at: string
  html_url: string
  draft?: boolean
  mergeable?: boolean
}

interface GhComment {
  id: number
  user?: GhUser
  body?: string
  created_at: string
}

async function ghFetch(endpoint: string, token: string, init?: RequestInit): Promise<Response> {
  const url = endpoint.startsWith('http') ? endpoint : `https://api.github.com${endpoint}`
  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${token}`)
  if (!headers.has('Accept')) headers.set('Accept', 'application/vnd.github+json')
  headers.set('X-GitHub-Api-Version', '2022-11-28')
  headers.set('User-Agent', 'GitGUI-Client')

  const res = await fetch(url, {
    ...init,
    headers,
    signal: init?.signal ?? AbortSignal.timeout(15000)
  })

  if (!res.ok) {
    let msg = `GitHub API error: ${res.status} ${res.statusText}`
    try {
      const errBody = (await res.json()) as { message?: string }
      if (errBody.message) msg = errBody.message
    } catch {
      /* non-json error */
    }
    if (res.status === 401) {
      throw new Error(`GitHub 认证失败（Token 无效或已过期）：${msg}`)
    }
    if (res.status === 404) {
      throw new Error(`GitHub 资源不存在或无访问权限（404）：${msg}`)
    }
    throw new Error(msg)
  }
  return res
}

function mapPr(p: GhPr): PullRequestDto {
  return {
    id: p.id,
    number: p.number,
    title: p.title,
    state: p.merged_at ? 'merged' : p.state === 'closed' ? 'closed' : 'open',
    author: { name: p.user?.login ?? '', avatarUrl: p.user?.avatar_url },
    sourceBranch: p.head?.ref ?? '',
    targetBranch: p.base?.ref ?? '',
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    url: p.html_url,
    draft: Boolean(p.draft)
  }
}

export class GitHubProvider implements GitProvider {
  readonly id = 'github' as const

  async authenticatePat(token: string): Promise<ProviderAccountDto> {
    const res = await ghFetch('/user', token)
    const user = (await res.json()) as GhUser
    return {
      provider: 'github',
      username: user.login,
      displayName: user.name ?? user.login,
      avatarUrl: user.avatar_url,
      authType: 'pat',
      createdAt: new Date().toISOString()
    }
  }

  async listRepositories(token: string): Promise<RemoteRepoDto[]> {
    const res = await ghFetch(
      '/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member',
      token
    )
    const list = (await res.json()) as Array<{
      id: number
      name: string
      full_name: string
      clone_url: string
      ssh_url?: string
      default_branch?: string
      private?: boolean
      description?: string
    }>
    return (list ?? []).map((r) => ({
      id: String(r.id),
      name: r.name,
      fullName: r.full_name,
      cloneUrl: r.clone_url,
      sshUrl: r.ssh_url,
      defaultBranch: r.default_branch,
      isPrivate: Boolean(r.private),
      description: r.description ?? undefined
    }))
  }

  async listPullRequests(ref: RepoRef, token: string, state: PrState | 'all' = 'open'): Promise<PullRequestDto[]> {
    const owner = ref.owner
    const repo = ref.repo
    if (!owner) throw new Error('GitHub 仓库缺少 owner')

    // GitHub API query parameter: state in ('open', 'closed', 'all')
    const ghState = state === 'merged' ? 'closed' : state === 'all' ? 'all' : state
    const res = await ghFetch(`/repos/${owner}/${repo}/pulls?state=${ghState}&per_page=50`, token)
    const list = (await res.json()) as GhPr[]
    const mapped = list.map(mapPr)

    if (state === 'merged') {
      return mapped.filter((p) => p.state === 'merged')
    }
    if (state === 'closed') {
      return mapped.filter((p) => p.state === 'closed')
    }
    return mapped
  }

  async getPullRequest(ref: RepoRef, token: string, id: number | string): Promise<PullRequestDetailDto> {
    const owner = ref.owner
    const repo = ref.repo
    if (!owner) throw new Error('GitHub 仓库缺少 owner')

    const num = Number(id)
    const [prRes, diffRes, commentsRes] = await Promise.all([
      ghFetch(`/repos/${owner}/${repo}/pulls/${num}`, token),
      ghFetch(`/repos/${owner}/${repo}/pulls/${num}`, token, {
        headers: { Accept: 'application/vnd.github.v3.diff' }
      }).catch(() => null),
      ghFetch(`/repos/${owner}/${repo}/issues/${num}/comments`, token).catch(() => null)
    ])

    const pr = (await prRes.json()) as GhPr
    const diff = diffRes ? await diffRes.text() : ''
    const rawComments = commentsRes ? ((await commentsRes.json()) as GhComment[]) : []

    const comments: PrCommentDto[] = rawComments.map((c) => ({
      id: c.id,
      author: { name: c.user?.login ?? '', avatarUrl: c.user?.avatar_url },
      body: c.body ?? '',
      createdAt: c.created_at
    }))

    return {
      ...mapPr(pr),
      description: pr.body ?? '',
      diff,
      comments,
      mergeable: pr.mergeable ?? undefined
    }
  }

  async createPullRequest(ref: RepoRef, token: string, input: CreatePrInputDto): Promise<PullRequestDto> {
    const owner = ref.owner
    const repo = ref.repo
    if (!owner) throw new Error('GitHub 仓库缺少 owner')

    const res = await ghFetch(`/repos/${owner}/${repo}/pulls`, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: input.title,
        body: input.description,
        head: input.sourceBranch,
        base: input.targetBranch,
        draft: input.draft ?? false
      })
    })

    const pr = (await res.json()) as GhPr
    return mapPr(pr)
  }

  async commentOnPullRequest(ref: RepoRef, token: string, id: number | string, body: string): Promise<void> {
    const owner = ref.owner
    const repo = ref.repo
    if (!owner) throw new Error('GitHub 仓库缺少 owner')

    const num = Number(id)
    await ghFetch(`/repos/${owner}/${repo}/issues/${num}/comments`, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body })
    })
  }

  async mergePullRequest(ref: RepoRef, token: string, id: number | string, method: PrMergeMethod): Promise<void> {
    const owner = ref.owner
    const repo = ref.repo
    if (!owner) throw new Error('GitHub 仓库缺少 owner')

    const num = Number(id)
    const ghMethod = method === 'squash' ? 'squash' : method === 'rebase' ? 'rebase' : 'merge'
    await ghFetch(`/repos/${owner}/${repo}/pulls/${num}/merge`, token, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merge_method: ghMethod })
    })
  }
}
