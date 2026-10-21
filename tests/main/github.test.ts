import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GitHubProvider } from '../../src/main/providers/github'
import type { RepoRef } from '../../src/shared/providers'

describe('GitHubProvider', () => {
  const provider = new GitHubProvider()
  const ref: RepoRef = {
    provider: 'github',
    owner: 'testowner',
    repo: 'testrepo',
    canonical: 'github.com/testowner/testrepo',
    originalUrl: 'https://github.com/testowner/testrepo'
  }
  const token = 'ghp_fakeToken123'

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
        login: 'octocat',
        name: 'The Octocat',
        avatar_url: 'https://avatars.githubusercontent.com/u/583231'
      })
    })

    const account = await provider.authenticatePat(token)
    expect(account.provider).toBe('github')
    expect(account.username).toBe('octocat')
    expect(account.displayName).toBe('The Octocat')
    expect(account.avatarUrl).toBe('https://avatars.githubusercontent.com/u/583231')
  })

  it('throws helpful error on 401 unauthorized', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ message: 'Bad credentials' })
    })

    await expect(provider.authenticatePat(token)).rejects.toThrow('GitHub 认证失败')
  })

  it('lists pull requests with state filtering', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          id: 101,
          number: 1,
          title: 'Add feature',
          state: 'open',
          user: { login: 'alice' },
          head: { ref: 'feat/abc' },
          base: { ref: 'main' },
          created_at: '2026-10-01T00:00:00Z',
          updated_at: '2026-10-02T00:00:00Z',
          html_url: 'https://github.com/testowner/testrepo/pull/1'
        }
      ]
    })

    const list = await provider.listPullRequests(ref, token, 'open')
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(101)
    expect(list[0].number).toBe(1)
    expect(list[0].state).toBe('open')
    expect(list[0].sourceBranch).toBe('feat/abc')
    expect(list[0].targetBranch).toBe('main')
  })

  it('gets pull request detail including diff and comments', async () => {
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      if (url.includes('/pulls/42') && headers.get('Accept')?.includes('diff')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => 'diff --git a/a.txt b/a.txt\n+hello'
        })
      }
      if (url.includes('/pulls/42')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            id: 42,
            number: 42,
            title: 'Cool PR',
            state: 'open',
            user: { login: 'bob' },
            body: 'Detailed description',
            created_at: '2026-10-01T00:00:00Z',
            updated_at: '2026-10-02T00:00:00Z',
            html_url: 'https://github.com/testowner/testrepo/pull/42',
            mergeable: true
          })
        })
      }
      if (url.includes('/issues/42/comments')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [
            {
              id: 999,
              user: { login: 'charlie' },
              body: 'Looks good!',
              created_at: '2026-10-02T01:00:00Z'
            }
          ]
        })
      }
      return Promise.reject(new Error(`unexpected url: ${url}`))
    })

    const detail = await provider.getPullRequest(ref, token, 42)
    expect(detail.number).toBe(42)
    expect(detail.title).toBe('Cool PR')
    expect(detail.description).toBe('Detailed description')
    expect(detail.diff).toBe('diff --git a/a.txt b/a.txt\n+hello')
    expect(detail.comments).toHaveLength(1)
    expect(detail.comments[0].body).toBe('Looks good!')
    expect(detail.mergeable).toBe(true)
  })

  it('creates, comments on, and merges a pull request', async () => {
    let createBody: unknown
    let commentBody: unknown
    let mergeMethodUsed: unknown

    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST' && url.includes('/pulls')) {
        createBody = JSON.parse(String(init.body))
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({
            id: 50,
            number: 50,
            title: 'New PR',
            state: 'open',
            user: { login: 'author' },
            head: { ref: 'source' },
            base: { ref: 'target' },
            created_at: '2026-10-01T00:00:00Z',
            updated_at: '2026-10-01T00:00:00Z',
            html_url: 'https://github.com/testowner/testrepo/pull/50'
          })
        })
      }
      if (init?.method === 'POST' && url.includes('/comments')) {
        commentBody = JSON.parse(String(init.body))
        return Promise.resolve({ ok: true, status: 201, json: async () => ({}) })
      }
      if (init?.method === 'PUT' && url.includes('/merge')) {
        mergeMethodUsed = JSON.parse(String(init.body))
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
      }
      return Promise.reject(new Error(`unexpected url: ${url}`))
    })

    const pr = await provider.createPullRequest(ref, token, {
      title: 'New PR',
      description: 'Desc',
      sourceBranch: 'source',
      targetBranch: 'target'
    })
    expect(pr.number).toBe(50)
    expect(createBody).toEqual({
      title: 'New PR',
      body: 'Desc',
      head: 'source',
      base: 'target',
      draft: false
    })

    await provider.commentOnPullRequest(ref, token, 50, 'Hello world')
    expect(commentBody).toEqual({ body: 'Hello world' })

    await provider.mergePullRequest(ref, token, 50, 'squash')
    expect(mergeMethodUsed).toEqual({ merge_method: 'squash' })
  })
})
