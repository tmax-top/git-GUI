import { describe, expect, it } from 'vitest'
import { parseRepoRef } from '../../src/shared/providers'

describe('parseRepoRef', () => {
  it('parses GitHub HTTPS URL with and without .git', () => {
    const r1 = parseRepoRef('https://github.com/octocat/Hello-World.git')
    expect(r1).toEqual({
      provider: 'github',
      owner: 'octocat',
      repo: 'Hello-World',
      canonical: 'github.com/octocat/Hello-World',
      originalUrl: 'https://github.com/octocat/Hello-World.git'
    })

    const r2 = parseRepoRef('https://github.com/octocat/Hello-World')
    expect(r2).toEqual({
      provider: 'github',
      owner: 'octocat',
      repo: 'Hello-World',
      canonical: 'github.com/octocat/Hello-World',
      originalUrl: 'https://github.com/octocat/Hello-World'
    })
  })

  it('parses GitHub SSH SCP format', () => {
    const r = parseRepoRef('git@github.com:torvalds/linux.git')
    expect(r).toEqual({
      provider: 'github',
      owner: 'torvalds',
      repo: 'linux',
      canonical: 'github.com/torvalds/linux',
      originalUrl: 'git@github.com:torvalds/linux.git'
    })
  })

  it('parses GitHub SSH protocol URL', () => {
    const r = parseRepoRef('ssh://git@github.com/facebook/react.git')
    expect(r).toEqual({
      provider: 'github',
      owner: 'facebook',
      repo: 'react',
      canonical: 'github.com/facebook/react',
      originalUrl: 'ssh://git@github.com/facebook/react.git'
    })
  })

  it('parses Azure DevOps dev.azure.com HTTPS URL', () => {
    const r = parseRepoRef('https://dev.azure.com/my-org/my-proj/_git/my-repo')
    expect(r).toEqual({
      provider: 'azuredevops',
      org: 'my-org',
      project: 'my-proj',
      repo: 'my-repo',
      canonical: 'dev.azure.com/my-org/my-proj/_git/my-repo',
      originalUrl: 'https://dev.azure.com/my-org/my-proj/_git/my-repo'
    })
  })

  it('parses Azure DevOps visualstudio.com URL', () => {
    const r = parseRepoRef('https://my-org.visualstudio.com/my-proj/_git/my-repo.git')
    expect(r).toEqual({
      provider: 'azuredevops',
      org: 'my-org',
      project: 'my-proj',
      repo: 'my-repo',
      canonical: 'dev.azure.com/my-org/my-proj/_git/my-repo',
      originalUrl: 'https://my-org.visualstudio.com/my-proj/_git/my-repo.git'
    })
  })

  it('parses Azure DevOps SSH format', () => {
    const r = parseRepoRef('git@ssh.dev.azure.com:v3/my-org/my-proj/my-repo')
    expect(r).toEqual({
      provider: 'azuredevops',
      org: 'my-org',
      project: 'my-proj',
      repo: 'my-repo',
      canonical: 'dev.azure.com/my-org/my-proj/_git/my-repo',
      originalUrl: 'git@ssh.dev.azure.com:v3/my-org/my-proj/my-repo'
    })
  })

  it('returns null for unsupported URLs or invalid input', () => {
    expect(parseRepoRef('')).toBeNull()
    expect(parseRepoRef('https://gitlab.com/owner/repo.git')).toBeNull()
    expect(parseRepoRef('https://bitbucket.org/owner/repo.git')).toBeNull()
    expect(parseRepoRef('/tmp/local/repo')).toBeNull()
  })
})
