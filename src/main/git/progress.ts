export interface ProgressEvent {
  stage: string
  percent?: number
  current?: number
  total?: number
  raw: string
}

const PROGRESS_RE = /^([^:]+):\s+(?:(\d+)%\s+\((\d+)\/(\d+)\))?(.*)$/

export function parseProgressChunk(chunk: string): ProgressEvent[] {
  const events: ProgressEvent[] = []
  for (const rawLine of chunk.split(/\r?\n/)) {
    const line = rawLine.replace(/^remote:\s*/, '').trim()
    if (!line) continue
    const m = PROGRESS_RE.exec(line)
    if (!m) continue
    const stage = m[1].trim()
    if (!stage || !/\b(objects|deltas|Compressing|Receiving|Resolving|Counting|Writing|Enumerating)\b/i.test(stage)) {
      continue
    }
    events.push({
      stage,
      percent: m[2] ? Number(m[2]) : undefined,
      current: m[3] ? Number(m[3]) : undefined,
      total: m[4] ? Number(m[4]) : undefined,
      raw: line
    })
  }
  return events
}
