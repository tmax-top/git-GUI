import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AzureDevOpsProvider } from '../../src/main/providers/azuredevops'
import type { RepoRef } from '../../src/shared/providers'

describe('AzureDevOpsProvider', () => {
  const provider = new AzureDevOpsProvider()
  const ref: RepoRef = {
    provider: 'azuredevops',
    org: 'myorg',
    project: 'myproj',
    repo: 'myrepo',
    canonical: 'dev.azure.com/myorg/myproj/_git/myrepo',
    originalUrl: 'https://dev.azure.com/myorg/myproj/_git/myrepo'
  }
  const token = 'ado_fake_pat_token'

  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('authenticates with PAT and maps user details', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        authenticatedUser: {
          id: 'user-uuid',
          displayName: 'Azure Engineer'
        }
      })
    })

    const account = await provider.authenticatePat(token, { org: 'myorg' })
    expect(account.provider).toBe('azuredevops')
    expect(account.username).toBe('Azure Engineer')
    expect(account.displayName).toBe('Azure Engineer')
  })

  it('throws helpful error on 401 unauthorized', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ message: 'Invalid PAT' })
    })

    await expect(provider.authenticatePat(token, { org: 'myorg' })).rejects.toThrow('Azure DevOps 认证失败')
  })

  it('lists pull requests and maps state', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        value: [
          {
            pullRequestId: 202,
            title: 'Fix issue',
            status: 'active',
            createdBy: { displayName: 'Dev User' },
            sourceRefName: 'refs/heads/feature/x',
            targetRefName: 'refs/heads/main',
            creationDate: '2026-10-01T00:00:00Z'
          }
        ]
      })
    })

    const list = await provider.listPullRequests(ref, token, 'open')
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(202)
    expect(list[0].number).toBe(202)
    expect(list[0].state).toBe('open')
    expect(list[0].sourceBranch).toBe('feature/x')
    expect(list[0].targetBranch).toBe('main')
  })

  it('gets pull request detail including threads', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/threads')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            value: [
              {
                id: 1,
                comments: [
                  {
                    id: 10,
                    content: 'Thread comment',
                    author: { displayName: 'Reviewer' },
                    publishedDate: '2026-10-02T00:00:00Z',
                    commentType: 1
                  }
                ]
              }
            ]
          })
        })
      }
      if (url.includes('/iterations')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ value: [] })
        })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          pullRequestId: 300,
          title: 'ADO PR',
          description: 'PR body',
          status: 'completed',
          createdBy: { displayName: 'Dev' },
          sourceRefName: 'refs/heads/feat',
          targetRefName: 'refs/heads/main',
          creationDate: '2026-10-01T00:00:00Z',
          mergeStatus: 'succeeded'
        })
      })
    })

    const detail = await provider.getPullRequest(ref, token, 300)
    expect(detail.number).toBe(300)
    expect(detail.state).toBe('merged')
    expect(detail.description).toBe('PR body')
    expect(detail.comments).toHaveLength(1)
    expect(detail.comments[0].body).toBe('Thread comment')
    expect(detail.mergeable).toBe(true)
  })

  it('creates, comments, and merges in Azure DevOps', async () => {
    let postBody: unknown
    let commentBody: unknown
    let mergeBody: unknown

    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST' && url.includes('/pullrequests') && !url.includes('/threads')) {
        postBody = JSON.parse(String(init.body))
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({
            pullRequestId: 400,
            title: 'Created PR',
            status: 'active',
            createdBy: { displayName: 'Dev' },
            sourceRefName: 'refs/heads/src',
            targetRefName: 'refs/heads/main',
            creationDate: '2026-10-01T00:00:00Z'
          })
        })
      }
      if (init?.method === 'POST' && url.includes('/threads')) {
        commentBody = JSON.parse(String(init.body))
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
      }
      if (init?.method === 'PATCH' && url.includes('/pullrequests')) {
        mergeBody = JSON.parse(String(init.body))
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
      }
      return Promise.reject(new Error(`unexpected url: ${url}`))
    })

    const pr = await provider.createPullRequest(ref, token, {
      title: 'Created PR',
      description: 'Desc',
      sourceBranch: 'src',
      targetBranch: 'main'
    })
    expect(pr.number).toBe(400)
    expect(postBody).toEqual({
      sourceRefName: 'refs/heads/src',
      targetRefName: 'refs/heads/main',
      title: 'Created PR',
      description: 'Desc',
      isDraft: false
    })

    await provider.commentOnPullRequest(ref, token, 400, 'Comment text')
    expect(commentBody).toEqual({
      comments: [
        {
          parentCommentId: 0,
          content: 'Comment text',
          commentType: 1
        }
      ],
      status: 1
    })

    await provider.mergePullRequest(ref, token, 400, 'squash')
    expect(mergeBody).toEqual({
      status: 'completed',
      completionOptions: {
        mergeStrategy: 'squash',
        deleteSourceBranch: false
      }
    })
  })
})
