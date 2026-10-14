export interface DiffLine {
  type: '+' | '-' | ' ' | '\\'
  content: string
}

export interface DiffHunk {
  header: string
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: DiffLine[]
}

export interface DiffFile {
  path: string
  origPath?: string
  oldMode?: string
  newMode?: string
  status?: string
  binary?: boolean
  /** Raw header lines from `diff --git` up to the first hunk (inclusive of ---/+++). */
  headerLines: string[]
  hunks: DiffHunk[]
}

export function parseUnifiedDiff(diffText: string): DiffFile[] {
  const files: DiffFile[] = []
  if (!diffText.trim()) return files

  const lines = diffText.split('\n')
  let current: DiffFile | null = null
  let hunk: DiffHunk | null = null

  const pushCurrent = (): void => {
    if (current) files.push(current)
    current = null
    hunk = null
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('diff --git ')) {
      pushCurrent()
      const m = /^diff --git "?a\/(.*?)"? "?b\/(.*?)"?$/.exec(line)
      current = {
        path: m ? m[2] : line.slice(12),
        origPath: m && m[1] !== m[2] ? m[1] : undefined,
        headerLines: [line],
        hunks: []
      }
      continue
    }
    if (!current) continue

    // Collect raw header lines (everything between `diff --git` and the first
    // hunk) — the `@@` line itself is stored on the hunk, not the header.
    if (!hunk && !line.startsWith('@@')) {
      current.headerLines.push(line)
    }

    if (line.startsWith('old mode ')) {
      current.oldMode = line.slice(9)
    } else if (line.startsWith('new mode ')) {
      current.newMode = line.slice(9)
    } else if (line.startsWith('new file mode ')) {
      current.status = 'new'
      current.newMode = line.slice(14)
    } else if (line.startsWith('deleted file mode ')) {
      current.status = 'deleted'
      current.oldMode = line.slice(18)
    } else if (line.startsWith('rename from ')) {
      current.origPath = line.slice(12)
      current.status = 'renamed'
    } else if (line.startsWith('rename to ')) {
      current.path = line.slice(10)
      current.status = 'renamed'
    } else if (line.startsWith('copy from ')) {
      current.origPath = line.slice(10)
      current.status = 'copied'
    } else if (line.startsWith('copy to ')) {
      current.path = line.slice(8)
      current.status = 'copied'
    } else if (line.startsWith('Binary files ') || line.startsWith('GIT binary patch')) {
      current.binary = true
    } else if (line.startsWith('@@')) {
      const m = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line)
      if (m) {
        hunk = {
          header: line,
          oldStart: Number(m[1]),
          oldLines: m[2] != null ? Number(m[2]) : 1,
          newStart: Number(m[3]),
          newLines: m[4] != null ? Number(m[4]) : 1,
          lines: []
        }
        current.hunks.push(hunk)
      }
    } else if (hunk) {
      if (line.startsWith('+')) {
        hunk.lines.push({ type: '+', content: line.slice(1) })
      } else if (line.startsWith('-')) {
        hunk.lines.push({ type: '-', content: line.slice(1) })
      } else if (line.startsWith('\\')) {
        hunk.lines.push({ type: '\\', content: line.slice(1) })
      } else if (line.startsWith(' ')) {
        hunk.lines.push({ type: ' ', content: line.slice(1) })
      } else if (line === '') {
        // trailing newline artifact of split — nothing to record
      }
    }
  }
  pushCurrent()
  return files
}

/**
 * Reconstruct a single-hunk patch suitable for `git apply --cached [--reverse]`.
 * Returns null when the file is binary or the hunk index is out of range.
 */
export function buildHunkPatch(file: DiffFile, hunkIndex: number): string | null {
  if (file.binary) return null
  const hunk = file.hunks[hunkIndex]
  if (!hunk) return null
  const body = hunk.lines.map((l) => `${l.type}${l.content}`)
  return [...file.headerLines, hunk.header, ...body].join('\n') + '\n'
}

/** Character-level common affix between two lines (for word-level highlighting). */
export function commonAffix(a: string, b: string): { prefix: number; suffix: number } {
  let prefix = 0
  const max = Math.min(a.length, b.length)
  while (prefix < max && a[prefix] === b[prefix]) prefix++
  let suffix = 0
  while (
    suffix < max - prefix &&
    a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  ) {
    suffix++
  }
  return { prefix, suffix }
}
