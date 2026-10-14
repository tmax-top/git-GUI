import { describe, expect, it } from 'vitest'
import { getLog } from '@main/git/log'
import { commitFile, git, makeMergeRepo, makeTempRepo } from '../fixtures/repo'

describe('getLog', () => {
  it('returns commits newest-first with parents linked', async () => {
    const repo = makeTempRepo()
    try {
      const c1 = commitFile(repo.dir, 'a.txt', '1\n', 'first')
      const c2 = commitFile(repo.dir, 'a.txt', '2\n', 'second')
      const c3 = commitFile(repo.dir, 'a.txt', '3\n', 'third')

      const log = await getLog(repo.dir)
      expect(log.map((c) => c.oid)).toEqual([c3, c2, c1])
      expect(log[0].subject).toBe('third')
      expect(log[0].parents).toEqual([c2])
      expect(log[2].parents).toEqual([])
      expect(log[0].authorName).toBe('Test User')
    } finally {
      repo.cleanup()
    }
  })

  it('respects limit and skip', async () => {
    const repo = makeTempRepo()
    try {
      commitFile(repo.dir, 'a.txt', '1\n', 'first')
      commitFile(repo.dir, 'a.txt', '2\n', 'second')
      commitFile(repo.dir, 'a.txt', '3\n', 'third')

      const page1 = await getLog(repo.dir, { limit: 2 })
      expect(page1).toHaveLength(2)
      expect(page1[0].subject).toBe('third')

      const page2 = await getLog(repo.dir, { limit: 2, skip: 2 })
      expect(page2).toHaveLength(1)
      expect(page2[0].subject).toBe('first')
    } finally {
      repo.cleanup()
    }
  })

  it('lists merge commits with two parents', async () => {
    const repo = makeMergeRepo()
    try {
      const log = await getLog(repo.dir)
      const merge = log.find((c) => c.subject === 'merge feature')
      expect(merge).toBeDefined()
      expect(merge!.parents).toHaveLength(2)
      // --all includes the feature branch tip
      expect(log.some((c) => c.subject === 'feature work')).toBe(true)
      expect(git(repo.dir, 'rev-list', '--count', '--all').trim()).toBe(String(log.length))
    } finally {
      repo.cleanup()
    }
  })
})
