import { describe, expect, it } from 'vitest'
import { parseProgressChunk } from '@main/git/progress'

describe('parseProgressChunk', () => {
  it('parses receiving objects lines', () => {
    const chunk = [
      'remote: Counting objects:  25% (2/8), done.',
      'Receiving objects:  50% (4/8), 1.25 KiB | 1.25 KiB/s',
      'Resolving deltas: 100% (6/6), completed.',
      'Unpacking objects: 100% (8/8), done.'
    ].join('\n')

    const events = parseProgressChunk(chunk)
    expect(events.length).toBeGreaterThanOrEqual(4)
    expect(events[0]).toMatchObject({ stage: 'Counting objects', percent: 25, current: 2, total: 8 })
    expect(events[1]).toMatchObject({ stage: 'Receiving objects', percent: 50, current: 4, total: 8 })
    expect(events[2]).toMatchObject({ stage: 'Resolving deltas', percent: 100, current: 6, total: 6 })
  })

  it('ignores unrelated lines', () => {
    expect(parseProgressChunk('warning: foo\nnote: bar\n')).toHaveLength(0)
  })

  it('handles CRLF and empty chunks', () => {
    const events = parseProgressChunk('Receiving objects:  10% (1/10)\r\n\r\n')
    expect(events).toHaveLength(1)
    expect(parseProgressChunk('')).toHaveLength(0)
  })
})
