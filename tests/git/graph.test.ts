import { describe, expect, it } from 'vitest'
import { parseRevListParents, revList } from '@main/git/graph'
import { makeMergeRepo, makeTempRepo, commitFile } from '../fixtures/repo'

describe('parseRevListParents', () => {
  it('parses oid and parent lists', () => {
    const out = ['aaa bbb ccc', 'bbb ddd', 'ccc', ''].join('\n')
    expect(parseRevListParents(out)).toEqual([
      { oid: 'aaa', parents: ['bbb', 'ccc'] },
      { oid: 'bbb', parents: ['ddd'] },
      { oid: 'ccc', parents: [] }
    ])
  })
})

describe('revList on real repos', () => {
  it('linear history has single-parent chain ending at root', async () => {
    const repo = makeTempRepo()
    try {
      commitFile(repo.dir, 'a.txt', '1\n', 'one')
      const c2 = commitFile(repo.dir, 'a.txt', '2\n', 'two')
      const commits = await revList(repo.dir)
      expect(commits[0].oid).toBe(c2)
      expect(commits[0].parents).toHaveLength(1)
      expect(commits[commits.length - 1].parents).toHaveLength(0)
    } finally {
      repo.cleanup()
    }
  })

  it('merge commit appears with two parents in topo order', async () => {
    const repo = makeMergeRepo()
    try {
      const commits = await revList(repo.dir)
      const merge = commits.find((c) => c.parents.length === 2)
      expect(merge).toBeDefined()
      // topological order: merge commit before its parents
      const mergeIdx = commits.findIndex((c) => c.oid === merge!.oid)
      for (const p of merge!.parents) {
        const pIdx = commits.findIndex((c) => c.oid === p)
        expect(pIdx).toBeGreaterThan(mergeIdx)
      }
    } finally {
      repo.cleanup()
    }
  })
})
