import { describe, expect, it } from 'vitest'
import {
  hasConflictMarkers,
  parseConflictMarkers,
  renderResolved,
  type ConflictChoice
} from '@shared/conflict'

describe('parseConflictMarkers', () => {
  it('splits plain text with no markers', () => {
    const p = parseConflictMarkers('a\nb\n')
    expect(p.count).toBe(0)
    expect(p.segments).toEqual([{ kind: 'text', lines: ['a', 'b'] }])
  })

  it('parses a single two-way conflict with labels', () => {
    const text = ['head', '<<<<<<< HEAD', 'ours line', '=======', 'theirs line', '>>>>>>> feature', 'tail'].join('\n') + '\n'
    const p = parseConflictMarkers(text)
    expect(p.count).toBe(1)
    expect(p.segments).toHaveLength(3)
    const [head, conflict, tail] = p.segments
    expect(head).toEqual({ kind: 'text', lines: ['head'] })
    expect(conflict).toEqual({
      kind: 'conflict',
      oursLabel: 'HEAD',
      theirsLabel: 'feature',
      ours: ['ours line'],
      base: null,
      theirs: ['theirs line']
    })
    expect(tail).toEqual({ kind: 'text', lines: ['tail'] })
  })

  it('parses a diff3 conflict with a base block', () => {
    const text = [
      '<<<<<<< HEAD',
      'ours a',
      '||||||| merged common ancestors',
      'base a',
      '=======',
      'theirs a',
      '>>>>>>> feature'
    ].join('\n')
    const p = parseConflictMarkers(text)
    expect(p.count).toBe(1)
    const c = p.segments[0]
    expect(c.kind).toBe('conflict')
    if (c.kind !== 'conflict') throw new Error('expected conflict')
    expect(c.ours).toEqual(['ours a'])
    expect(c.base).toEqual(['base a'])
    expect(c.theirs).toEqual(['theirs a'])
    expect(c.oursLabel).toBe('HEAD')
    expect(c.theirsLabel).toBe('feature')
  })

  it('handles multi-line ours/theirs and multiple conflicts', () => {
    const text = [
      '<<<<<<< H',
      'o1',
      'o2',
      '=======',
      't1',
      't2',
      '>>>>>>> F',
      'between',
      '<<<<<<< H',
      'o3',
      '=======',
      't3',
      '>>>>>>> F'
    ].join('\n')
    const p = parseConflictMarkers(text)
    expect(p.count).toBe(2)
    const [c1, mid, c2] = [p.segments[0], p.segments[1], p.segments[2]]
    expect(c1.kind === 'conflict' && c1.ours).toEqual(['o1', 'o2'])
    expect(c1.kind === 'conflict' && c1.theirs).toEqual(['t1', 't2'])
    expect(mid).toEqual({ kind: 'text', lines: ['between'] })
    expect(c2.kind === 'conflict' && c2.ours).toEqual(['o3'])
    expect(c2.kind === 'conflict' && c2.theirs).toEqual(['t3'])
  })

  it('treats an unclosed marker run as plain text', () => {
    const text = ['<<<<<<< HEAD', 'ours line', '=======', 'no closer'].join('\n')
    const p = parseConflictMarkers(text)
    expect(p.count).toBe(0)
    const flat = p.segments.flatMap((s) => (s.kind === 'text' ? s.lines : []))
    expect(flat).toEqual(['<<<<<<< HEAD', 'ours line', '=======', 'no closer'])
  })

  it('treats markers with no separator as plain text', () => {
    const text = ['<<<<<<< HEAD', 'ours only', '>>>>>>> feature'].join('\n')
    const p = parseConflictMarkers(text)
    expect(p.count).toBe(0)
  })
})

describe('renderResolved', () => {
  const text = [
    'head',
    '<<<<<<< HEAD',
    'ours line',
    '=======',
    'theirs line',
    '>>>>>>> feature',
    'tail'
  ].join('\n') + '\n'
  const { segments } = parseConflictMarkers(text)

  function render(choices: ConflictChoice[]): string {
    return renderResolved(segments, choices)
  }

  it('picks ours', () => {
    expect(render([{ type: 'ours' }])).toBe('head\nours line\ntail\n')
  })

  it('picks theirs', () => {
    expect(render([{ type: 'theirs' }])).toBe('head\ntheirs line\ntail\n')
  })

  it('applies custom resolution lines', () => {
    expect(render([{ type: 'custom', lines: ['merged line'] }])).toBe('head\nmerged line\ntail\n')
  })

  it('round-trips: a file with markers parsed and re-rendered as ours loses markers', () => {
    const out = render([{ type: 'ours' }])
    expect(hasConflictMarkers(out)).toBe(false)
    expect(out).not.toContain('=======')
  })

  it('defaults to ours when choices are missing', () => {
    expect(render([])).toBe('head\nours line\ntail\n')
  })

  it('re-renders text-only content unchanged', () => {
    const plain = parseConflictMarkers('a\nb\n')
    expect(renderResolved(plain.segments, [])).toBe('a\nb\n')
  })
})

describe('hasConflictMarkers', () => {
  it('detects an open marker', () => {
    expect(hasConflictMarkers('<<<<<<< HEAD\nx\n')).toBe(true)
  })
  it('is false for resolved content', () => {
    expect(hasConflictMarkers('just text\n=======\n')).toBe(false)
  })
})
