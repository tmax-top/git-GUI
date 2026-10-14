import { describe, expect, it } from 'vitest'
import { revList } from '@main/git/graph'
import { layoutGraph, layoutToAscii, type GraphNodeInput } from '@renderer/graph/layout'
import { commitFile, git, makeBranchyRepo, makeMergeRepo, makeTempRepo } from '../fixtures/repo'

function assertInvariants(nodes: GraphNodeInput[], layout: ReturnType<typeof layoutGraph>): void {
  expect(layout.rows).toHaveLength(nodes.length)
  expect(layout.laneCount).toBeGreaterThanOrEqual(1)

  const rowByOid = new Map(layout.rows.map((r) => [r.oid, r]))
  for (const node of nodes) {
    const row = rowByOid.get(node.oid)
    expect(row).toBeDefined()
    expect(row!.lane).toBeGreaterThanOrEqual(0)
    expect(row!.lane).toBeLessThan(layout.laneCount)
  }

  for (const s of layout.segments) {
    expect(s.fromLane).toBeGreaterThanOrEqual(0)
    expect(s.toLane).toBeGreaterThanOrEqual(0)
    expect(s.fromLane).toBeLessThan(layout.laneCount)
    expect(s.toLane).toBeLessThan(layout.laneCount)
  }

  // Every parent referenced inside the node set must eventually get a row.
  const oids = new Set(nodes.map((n) => n.oid))
  for (const node of nodes) {
    for (const p of node.parents) {
      if (oids.has(p)) expect(rowByOid.has(p)).toBe(true)
    }
  }
}

describe('layoutGraph', () => {
  it('assigns a single lane for a linear chain', () => {
    const nodes: GraphNodeInput[] = [
      { oid: 'c', parents: ['b'] },
      { oid: 'b', parents: ['a'] },
      { oid: 'a', parents: [] }
    ]
    const layout = layoutGraph(nodes)
    expect(layout.laneCount).toBe(1)
    expect(layout.rows.map((r) => r.lane)).toEqual([0, 0, 0])
    expect(layout.segments).toHaveLength(0)
    expect(layoutToAscii(layout)).toBe('*\n*\n*')
  })

  it('opens a second lane for a side branch and merges back', () => {
    // newest first: merge M with parents (m1, s1); m1 <- m0; s1 <- s0; m0 <- root; s0 <- root
    const nodes: GraphNodeInput[] = [
      { oid: 'M', parents: ['m1', 's1'] },
      { oid: 'm1', parents: ['m0'] },
      { oid: 's1', parents: ['s0'] },
      { oid: 'm0', parents: ['root'] },
      { oid: 's0', parents: ['root'] },
      { oid: 'root', parents: [] }
    ]
    const layout = layoutGraph(nodes)
    assertInvariants(nodes, layout)
    expect(layout.rows[0].lane).toBe(0)
    expect(layout.laneCount).toBe(2)
    // Second parent opens a new lane from the merge commit (branch segment).
    expect(layout.segments.some((s) => s.row === 0 && s.kind === 'branch' && s.toLane === 1)).toBe(true)
  })

  it('handles an octopus merge (3+ parents)', () => {
    const nodes: GraphNodeInput[] = [
      { oid: 'oct', parents: ['p1', 'p2', 'p3'] },
      { oid: 'p1', parents: ['base'] },
      { oid: 'p2', parents: ['base'] },
      { oid: 'p3', parents: ['base'] },
      { oid: 'base', parents: [] }
    ]
    const layout = layoutGraph(nodes)
    assertInvariants(nodes, layout)
    expect(layout.laneCount).toBeGreaterThanOrEqual(3)
  })

  it('matches git log --graph star column count on a linear repo', async () => {
    const repo = makeTempRepo()
    try {
      commitFile(repo.dir, 'a.txt', '1\n', 'one')
      commitFile(repo.dir, 'a.txt', '2\n', 'two')
      commitFile(repo.dir, 'a.txt', '3\n', 'three')

      const commits = await revList(repo.dir)
      const layout = layoutGraph(commits)
      expect(layout.laneCount).toBe(1)

      const graphAscii = git(repo.dir, 'log', '--graph', '--format=%h', '--all')
      const starRows = graphAscii.split('\n').filter((l) => l.includes('*'))
      expect(starRows).toHaveLength(commits.length)
    } finally {
      repo.cleanup()
    }
  })

  it('lays out real merge and branchy repos without breaking invariants', async () => {
    for (const factory of [makeMergeRepo, makeBranchyRepo]) {
      const repo = factory()
      try {
        const commits = await revList(repo.dir)
        const layout = layoutGraph(commits)
        assertInvariants(commits, layout)
        expect(layout.laneCount).toBeGreaterThanOrEqual(1)
        expect(layout.segments.length).toBeGreaterThan(0)
      } finally {
        repo.cleanup()
      }
    }
  })

  it('is stable under snapshot for the merge fixture', async () => {
    const repo = makeMergeRepo()
    try {
      const commits = await revList(repo.dir)
      const layout = layoutGraph(commits)
      const shape = {
        laneCount: layout.laneCount,
        rows: layout.rows.map((r) => ({ lane: r.lane })),
        segments: layout.segments.map((s) => ({ row: s.row, from: s.fromLane, to: s.toLane, kind: s.kind }))
      }
      expect(shape).toMatchSnapshot()
    } finally {
      repo.cleanup()
    }
  })
})
