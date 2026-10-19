/**
 * Merge-conflict marker parsing (<<<<<<< / ||||||| / ======= / >>>>>>>).
 *
 * Shared by the conflict editor (renderer) and the main process so the same
 * model drives both display and reassembly.
 *
 * Git writes markers as:
 *
 *   <<<<<<< ours-label          ← ours section (stage 2)
 *   ...ours lines...
 *   ||||||| base-label          ← optional (diff3 / zdiff3 style, stage 1)
 *   ...base lines...
 *   =======                    ← separator
 *   ...theirs lines...
 *   >>>>>>> theirs-label        ← theirs section (stage 3)
 *
 * Without diff3 there is no `|||||||` block and `base` is null.
 */

export type ConflictChoice =
  | { type: 'ours' }
  | { type: 'theirs' }
  | { type: 'custom'; lines: string[] }

export type ConflictSegment =
  | { kind: 'text'; lines: string[] }
  | {
      kind: 'conflict'
      /** Ours label (after `<<<<<<<`). */
      oursLabel: string
      /** Theirs label (after `>>>>>>>`). */
      theirsLabel: string
      ours: string[]
      /** Base lines from a `|||||||` block, or null when absent. */
      base: string[] | null
      theirs: string[]
    }

export interface ConflictParse {
  segments: ConflictSegment[]
  /** Number of conflict regions. */
  count: number
}

const OURS_MARKER = /^<{7}(?:\s(.*))?$/
const BASE_MARKER = /^\|{7,}(?:\s(.*))?$/
const SEP_MARKER = /^={7}$/
const THEIRS_MARKER = /^>{7}(?:\s(.*))?$/

/**
 * Parse a worktree file containing conflict markers into ordered segments.
 *
 * Unclosed / malformed marker runs are treated as plain text so an interrupted
 * parse never silently drops content.
 */
export function parseConflictMarkers(text: string): ConflictParse {
  const lines = text.split('\n')
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()

  const segments: ConflictSegment[] = []
  const outBuf: string[] = []
  let count = 0

  const flushText = (): void => {
    if (outBuf.length > 0) {
      segments.push({ kind: 'text', lines: outBuf.splice(0, outBuf.length) })
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const start = OURS_MARKER.exec(lines[i])
    if (!start) {
      outBuf.push(lines[i])
      continue
    }

    const oursLabel = (start[1] ?? '').trim()
    const ours: string[] = []
    const theirs: string[] = []
    let base: string[] | null = null
    let theirsLabel = ''
    // 'ours' → collecting ours/base, 'theirs' → collecting theirs.
    let phase: 'ours' | 'theirs' = 'ours'
    let closed = false
    let j = i + 1

    for (; j < lines.length; j++) {
      const l = lines[j]

      if (phase === 'ours' && BASE_MARKER.test(l)) {
        base = []
        continue
      }
      if (SEP_MARKER.test(l)) {
        phase = 'theirs'
        continue
      }
      if (THEIRS_MARKER.test(l)) {
        // A closer is only valid after the `=======` separator — otherwise
        // the run is malformed and must stay plain text.
        if (phase !== 'theirs') break
        theirsLabel = (l.match(THEIRS_MARKER)?.[1] ?? '').trim()
        closed = true
        break
      }
      if (phase === 'ours') {
        ;(base ?? ours).push(l)
      } else {
        theirs.push(l)
      }
    }

    if (!closed) {
      // Malformed: keep the opening marker as text and resume scanning.
      outBuf.push(lines[i])
      continue
    }

    flushText()
    segments.push({ kind: 'conflict', oursLabel, theirsLabel, ours, base, theirs })
    count++
    i = j
  }

  flushText()
  return { segments, count }
}

/** Reassemble a file from segments + per-conflict choices into final text. */
export function renderResolved(segments: ConflictSegment[], choices: ConflictChoice[]): string {
  const out: string[] = []
  let ci = 0
  for (const seg of segments) {
    if (seg.kind === 'text') {
      out.push(...seg.lines)
      continue
    }
    const choice = choices[ci] ?? { type: 'ours' }
    ci++
    if (choice.type === 'ours') out.push(...seg.ours)
    else if (choice.type === 'theirs') out.push(...seg.theirs)
    else out.push(...choice.lines)
  }
  return out.length > 0 ? out.join('\n') + '\n' : ''
}

/** Does this text still contain conflict markers? */
export function hasConflictMarkers(text: string): boolean {
  return text.split('\n').some((l) => OURS_MARKER.test(l))
}
