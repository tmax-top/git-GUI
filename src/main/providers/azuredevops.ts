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

interface AdoUser {
  displayName?: string
  uniqueName?: string
  _links?: { avatar?: { href?: string } }
}

interface AdoPr {
  pullRequestId: number
  title: string
  description?: string
  status: 'active' | 'completed' | 'abandoned'
  createdBy?: AdoUser
  sourceRefName?: string
  targetRefName?: string
  creationDate: string
  isDraft?: boolean
  mergeStatus?: string
}

interface AdoThreadComment {
  id: number
  content?: string
  author?: AdoUser
  publishedDate: string
  commentType?: number
  isDeleted?: boolean
}

interface AdoThread {
  id: number
  comments?: AdoThreadComment[]
}

interface AdoChangeItem {
  changeType: string
  item?: { path?: string }
}

const ADO_API_VERSION = '7.1-preview'

async function adoFetch(url: string, token: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Basic ${Buffer.from(':' + token).toString('base64')}`)
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const res = await fetch(url, {
    ...init,
    headers,
    signal: init?.signal ?? AbortSignal.timeout(15000)
  })

  if (!res.ok) {
    let msg = `Azure DevOps API error: ${res.status} ${res.statusText}`
    try {
      const errBody = (await res.json()) as { message?: string }
      if (errBody.message) msg = errBody.message
    } catch {
      /* ignore */
    }
    if (res.status === 401) {
      throw new Error(`Azure DevOps 认证失败（PAT 无效或已过期）：${msg}`)
    }
    if (res.status === 404) {
      throw new Error(`Azure DevOps 资源不存在或无访问权限（404）：${msg}`)
    }
    throw new Error(msg)
  }
  return res
}

function mapPr(p: AdoPr, ref: RepoRef): PullRequestDto {
  const state: PrState =
    p.status === 'completed' ? 'merged' : p.status === 'abandoned' ? 'closed' : 'open'
  return {
    id: p.pullRequestId,
    number: p.pullRequestId,
    title: p.title,
    state,
    author: {
      name: p.createdBy?.displayName ?? p.createdBy?.uniqueName ?? 'Azure User',
      avatarUrl: p.createdBy?._links?.avatar?.href
    },
    sourceBranch: (p.sourceRefName ?? '').replace(/^refs\/heads\//, ''),
    targetBranch: (p.targetRefName ?? '').replace(/^refs\/heads\//, ''),
    createdAt: p.creationDate,
    updatedAt: p.creationDate,
    url: `https://dev.azure.com/${ref.org}/${ref.project}/_git/${ref.repo}/pullrequest/${p.pullRequestId}`,
    draft: Boolean(p.isDraft)
  }
}

export class AzureDevOpsProvider implements GitProvider {
  readonly id = 'azuredevops' as const

  async authenticatePat(token: string, options?: { org?: string }): Promise<ProviderAccountDto> {
    const org = options?.org
    if (org) {
      const res = await adoFetch(
        `https://dev.azure.com/${org}/_apis/connectionData?api-version=${ADO_API_VERSION}`,
        token
      )
      const data = (await res.json()) as {
        authenticatedUser?: { id: string; displayName?: string; providerDisplayName?: string }
      }
      const u = data.authenticatedUser
      const name = u?.displayName ?? u?.providerDisplayName ?? 'Azure DevOps User'
      return {
        provider: 'azuredevops',
        username: name,
        displayName: name,
        authType: 'pat',
        createdAt: new Date().toISOString(),
        org
      }
    }

    // Default VSSPS profile endpoint
    try {
      const res = await adoFetch(
        `https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=${ADO_API_VERSION}`,
        token
      )
      const data = (await res.json()) as { displayName?: string; publicAlias?: string; emailAddress?: string }
      const name = data.displayName ?? data.emailAddress ?? 'Azure DevOps User'
      return {
        provider: 'azuredevops',
        username: name,
        displayName: name,
        authType: 'pat',
        createdAt: new Date().toISOString()
      }
    } catch {
      // Fallback if VSSPS is restricted: token accepted
      return {
        provider: 'azuredevops',
        username: 'Azure DevOps User',
        displayName: 'Azure DevOps User',
        authType: 'pat',
        createdAt: new Date().toISOString()
      }
    }
  }

  async listRepositories(token: string, options?: { org?: string }): Promise<RemoteRepoDto[]> {
    const org = options?.org
    if (!org) return []
    const url = `https://dev.azure.com/${org}/_apis/git/repositories?api-version=${ADO_API_VERSION}`
    const res = await adoFetch(url, token)
    const data = (await res.json()) as {
      value?: Array<{
        id: string
        name: string
        remoteUrl?: string
        sshUrl?: string
        defaultBranch?: string
        project?: { name?: string }
      }>
    }
    const list = data.value ?? []
    return list.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.project?.name ? `${r.project.name} / ${r.name}` : r.name,
      cloneUrl: r.remoteUrl ?? `https://dev.azure.com/${org}/${r.project?.name ?? ''}/_git/${r.name}`,
      sshUrl: r.sshUrl,
      defaultBranch: (r.defaultBranch ?? '').replace(/^refs\/heads\//, ''),
      project: r.project?.name
    }))
  }

  async listPullRequests(ref: RepoRef, token: string, state: PrState | 'all' = 'open'): Promise<PullRequestDto[]> {
    const { org, project, repo } = ref
    if (!org || !project) throw new Error('Azure DevOps 仓库缺少 org 或 project')

    const adoStatus =
      state === 'open'
        ? 'active'
        : state === 'merged'
          ? 'completed'
          : state === 'closed'
            ? 'abandoned'
            : 'all'

    const url = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/pullrequests?searchCriteria.status=${adoStatus}&api-version=${ADO_API_VERSION}`
    const res = await adoFetch(url, token)
    const json = (await res.json()) as { value?: AdoPr[] }
    const list = json.value ?? []
    return list.map((p) => mapPr(p, ref))
  }

  async getPullRequest(ref: RepoRef, token: string, id: number | string): Promise<PullRequestDetailDto> {
    const { org, project, repo } = ref
    if (!org || !project) throw new Error('Azure DevOps 仓库缺少 org 或 project')

    const prId = Number(id)
    const base = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/pullrequests/${prId}`

    const [prRes, threadsRes, iterationsRes] = await Promise.all([
      adoFetch(`${base}?api-version=${ADO_API_VERSION}`, token),
      adoFetch(`${base}/threads?api-version=${ADO_API_VERSION}`, token).catch(() => null),
      adoFetch(`${base}/iterations?api-version=${ADO_API_VERSION}`, token).catch(() => null)
    ])

    const pr = (await prRes.json()) as AdoPr
    const threadsJson = threadsRes ? ((await threadsRes.json()) as { value?: AdoThread[] }) : null
    const threads = threadsJson?.value ?? []

    const comments: PrCommentDto[] = []
    for (const t of threads) {
      for (const c of t.comments ?? []) {
        if (c.isDeleted || !c.content?.trim()) continue
        // commentType 1 = text, 2 = codeChange, 3 = system
        if (c.commentType && c.commentType > 1) continue
        comments.push({
          id: c.id,
          author: {
            name: c.author?.displayName ?? c.author?.uniqueName ?? 'User',
            avatarUrl: c.author?._links?.avatar?.href
          },
          body: c.content,
          createdAt: c.publishedDate
        })
      }
    }

    // Try fetching changes for diff overview
    let diff = ''
    try {
      const iterJson = iterationsRes ? ((await iterationsRes.json()) as { value?: Array<{ id: number }> }) : null
      const iters = iterJson?.value ?? []
      if (iters.length > 0) {
        const lastId = iters[iters.length - 1].id
        const changesRes = await adoFetch(`${base}/iterations/${lastId}/changes?api-version=${ADO_API_VERSION}`, token)
        const changesJson = (await changesRes.json()) as { changeEntries?: AdoChangeItem[] }
        const changes = changesJson.changeEntries ?? []
        diff = changes
          .map((ch) => `--- a${ch.item?.path ?? ''}\n+++ b${ch.item?.path ?? ''}\n[${ch.changeType}]`)
          .join('\n\n')
      }
    } catch {
      /* diff unavailable */
    }

    return {
      ...mapPr(pr, ref),
      description: pr.description ?? '',
      diff,
      comments,
      mergeable: pr.mergeStatus === 'succeeded'
    }
  }

  async createPullRequest(ref: RepoRef, token: string, input: CreatePrInputDto): Promise<PullRequestDto> {
    const { org, project, repo } = ref
    if (!org || !project) throw new Error('Azure DevOps 仓库缺少 org 或 project')

    const url = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/pullrequests?api-version=${ADO_API_VERSION}`
    const res = await adoFetch(url, token, {
      method: 'POST',
      body: JSON.stringify({
        sourceRefName: `refs/heads/${input.sourceBranch}`,
        targetRefName: `refs/heads/${input.targetBranch}`,
        title: input.title,
        description: input.description,
        isDraft: input.draft ?? false
      })
    })

    const pr = (await res.json()) as AdoPr
    return mapPr(pr, ref)
  }

  async commentOnPullRequest(ref: RepoRef, token: string, id: number | string, body: string): Promise<void> {
    const { org, project, repo } = ref
    if (!org || !project) throw new Error('Azure DevOps 仓库缺少 org 或 project')

    const prId = Number(id)
    const url = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/pullrequests/${prId}/threads?api-version=${ADO_API_VERSION}`
    await adoFetch(url, token, {
      method: 'POST',
      body: JSON.stringify({
        comments: [
          {
            parentCommentId: 0,
            content: body,
            commentType: 1
          }
        ],
        status: 1
      })
    })
  }

  async mergePullRequest(ref: RepoRef, token: string, id: number | string, method: PrMergeMethod): Promise<void> {
    const { org, project, repo } = ref
    if (!org || !project) throw new Error('Azure DevOps 仓库缺少 org 或 project')

    const prId = Number(id)
    const url = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/pullrequests/${prId}?api-version=${ADO_API_VERSION}`
    // strategy: noFastForward, squash, rebase
    const mergeStrategy = method === 'squash' ? 'squash' : method === 'rebase' ? 'rebase' : 'noFastForward'
    await adoFetch(url, token, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'completed',
        completionOptions: {
          mergeStrategy,
          deleteSourceBranch: false
        }
      })
    })
  }
}
