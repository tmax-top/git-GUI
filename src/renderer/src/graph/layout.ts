export interface GraphNodeInput {
  oid: string
  parents: string[]
}

export interface GraphSegment {
  row: number
  fromLane: number
  toLane: number
  /** converge = extra lanes joining THIS commit's dot; merge/branch live in the gap below. */
  kind: 'converge' | 'merge' | 'branch'
  /** For merge/branch: the parent commit the segment points at (used for colouring). */
  parentOid?: string
}

export interface GraphRow {
  oid: string
  lane: number
  lanesUsed: number
  /** Lanes with an expected parent in the gap BELOW this row (vertical segments). */
  activeBelow: number[]
}

export interface GraphLayout {
  rows: GraphRow[]
  segments: GraphSegment[]
  laneCount: number
}

/**
 * Lane assignment over a topologically-ordered commit list (newest first).
 *
 * `lanes[i]` holds the oid expected to be placed next in lane i.
 * - The leftmost lane already reserved for the commit becomes its primary lane.
 * - Extra lanes reserved for the same commit converge (merge segments).
 * - First parent continues on the primary lane; extra parents either join an
 *   existing lane that already awaits them, or open a new lane (branch segment).
 */
export function layoutGraph(nodes: GraphNodeInput[]): GraphLayout {
  const lanes: (string | undefined)[] = []
  const rows: GraphRow[] = []
  const segments: GraphSegment[] = []

  for (let row = 0; row < nodes.length; row++) {
    const node = nodes[row]

    const matches: number[] = []
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i] === node.oid) matches.push(i)
    }

    let primary: number
    if (matches.length > 0) {
      primary = matches[0]
      for (let m = 1; m < matches.length; m++) {
        segments.push({ row, fromLane: matches[m], toLane: primary, kind: 'converge' })
        lanes[matches[m]] = undefined
      }
      lanes[primary] = undefined
    } else {
      primary = lanes.findIndex((l) => l === undefined)
      if (primary === -1) {
        primary = lanes.length
        lanes.push(undefined)
      }
    }

    if (node.parents.length > 0) {
      lanes[primary] = node.parents[0]
      for (let p = 1; p < node.parents.length; p++) {
        const parent = node.parents[p]
        const existing = lanes.findIndex((l, idx) => idx !== primary && l === parent)
        if (existing >= 0) {
          segments.push({ row, fromLane: primary, toLane: existing, kind: 'merge', parentOid: parent })
        } else {
          let target = lanes.findIndex((l) => l === undefined)
          if (target === -1) {
            target = lanes.length
            lanes.push(parent)
          } else {
            lanes[target] = parent
          }
          segments.push({ row, fromLane: primary, toLane: target, kind: 'branch', parentOid: parent })
        }
      }
    }

    const lanesUsed = lanes.reduce<number>((acc, l) => (l !== undefined ? acc + 1 : acc), 0)
    const activeBelow: number[] = []
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i] !== undefined) activeBelow.push(i)
    }
    rows.push({
      oid: node.oid,
      lane: primary,
      lanesUsed: Math.max(lanesUsed, primary + 1),
      activeBelow
    })
  }

  let maxLane = 0
  for (const r of rows) maxLane = Math.max(maxLane, r.lane)
  for (const s of segments) maxLane = Math.max(maxLane, s.fromLane, s.toLane)

  return { rows, segments, laneCount: maxLane + 1 }
}

/** Render a simple ASCII preview of the layout (used by golden tests / debugging). */
export function layoutToAscii(layout: GraphLayout): string {
  return layout.rows
    .map((r) => {
      const cells: string[] = []
      for (let i = 0; i < Math.max(layout.laneCount, 1); i++) {
        cells.push(i === r.lane ? '*' : '.')
      }
      return cells.join('')
    })
    .join('\n')
}
