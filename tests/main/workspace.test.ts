import { describe, expect, it } from 'vitest'
import { workspaceDtoSchema } from '../../src/shared/ipc'

describe('workspace schema and management', () => {
  it('validates a correct workspace DTO', () => {
    const valid = {
      id: 'ws1234567890',
      name: 'Backend Services',
      description: 'Microservices and gateways',
      repoPaths: ['/Users/dev/svc1', '/Users/dev/svc2', '/Users/dev/svc3'],
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-02T00:00:00.000Z'
    }
    const parsed = workspaceDtoSchema.safeParse(valid)
    expect(parsed.success).toBe(true)
  })

  it('rejects empty id or name', () => {
    const invalid = {
      id: '',
      name: '',
      repoPaths: [],
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-02T00:00:00.000Z'
    }
    const parsed = workspaceDtoSchema.safeParse(invalid)
    expect(parsed.success).toBe(false)
  })

  it('supports empty description and empty repoPaths list', () => {
    const valid = {
      id: 'ws_empty',
      name: 'New Workspace',
      repoPaths: [],
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z'
    }
    const parsed = workspaceDtoSchema.safeParse(valid)
    expect(parsed.success).toBe(true)
  })

  it('supports multiple repositories (>= 3) in a single workspace', () => {
    const repos = ['/path/to/repo1', '/path/to/repo2', '/path/to/repo3', '/path/to/repo4']
    const ws = {
      id: 'multi_repo_ws',
      name: 'Multi Repo Workspace',
      repoPaths: repos,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z'
    }
    const parsed = workspaceDtoSchema.parse(ws)
    expect(parsed.repoPaths).toHaveLength(4)
    expect(parsed.repoPaths).toEqual(repos)
  })
})
