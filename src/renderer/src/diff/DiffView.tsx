import { useEffect, useRef, useState } from 'react'
import type { DiffFile, DiffHunk, DiffLine } from '@shared/diff'
import { commonAffix } from '@shared/diff'
import { t } from '../i18n'

type HunkAction = 'stage' | 'unstage' | null

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  svg: 'image/svg+xml'
}

export function mimeFor(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return MIME[ext] ?? 'application/octet-stream'
}

interface LinePair {
  minus: DiffLine | null
  plus: DiffLine | null
  oldNum: number | null
  newNum: number | null
}

function pairLines(hunk: DiffHunk): LinePair[] {
  const pairs: LinePair[] = []
  let oldLine = hunk.oldStart
  let newLine = hunk.newStart
  let i = 0
  const lines = hunk.lines
  while (i < lines.length) {
    const line = lines[i]
    if (line.type === '-') {
      const minusRun: DiffLine[] = []
      while (i < lines.length && lines[i].type === '-') minusRun.push(lines[i++])
      const plusRun: DiffLine[] = []
      while (i < lines.length && lines[i].type === '+') plusRun.push(lines[i++])
      const n = Math.max(minusRun.length, plusRun.length)
      for (let k = 0; k < n; k++) {
        const minus = minusRun[k] ?? null
        const plus = plusRun[k] ?? null
        const oldNum = minus ? oldLine++ : null
        const newNum = plus ? newLine++ : null
        pairs.push({ minus, plus, oldNum, newNum })
      }
    } else if (line.type === '+') {
      pairs.push({ minus: null, plus: line, oldNum: null, newNum: newLine++ })
      i++
    } else {
      pairs.push({ minus: line, plus: line.type === ' ' ? line : null, oldNum: oldLine++, newNum: newLine++ })
      i++
    }
  }
  return pairs
}

function WordDiffText(props: { a: string; b: string; side: 'minus' | 'plus' }): React.JSX.Element | string {
  const { a, b, side } = props
  const other = side === 'minus' ? b : a
  const { prefix, suffix } = commonAffix(a, other)
  const head = a.slice(0, prefix)
  const tail = a.slice(a.length - suffix)
  const mid = a.slice(prefix, a.length - suffix)
  if (!mid) return a
  return (
    <>
      {head}
      <mark
        className={
          side === 'minus'
            ? 'bg-rose-500/30 text-rose-200'
            : 'bg-emerald-500/30 text-emerald-200'
        }
      >
        {mid}
      </mark>
      {tail}
    </>
  )
}

function HunkView(props: {
  hunk: DiffHunk
  index: number
  action: HunkAction
  onHunk: ((file: DiffFile, index: number) => void) | undefined
  file: DiffFile
  word: boolean
  split: boolean
}): React.JSX.Element {
  const { hunk, action, split, word } = props
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)

  // Both halves scroll horizontally in lockstep so old/new sides stay aligned.
  const syncScroll = (from: 'left' | 'right'): void => {
    const src = from === 'left' ? leftRef.current : rightRef.current
    const dst = from === 'left' ? rightRef.current : leftRef.current
    if (!src || !dst) return
    if (Math.abs(src.scrollLeft - dst.scrollLeft) < 1) return
    dst.scrollLeft = src.scrollLeft
  }

  let newLine = hunk.newStart
  const oldNums: (number | null)[] = []
  const newNums: (number | null)[] = []
  for (const l of hunk.lines) {
    if (l.type === '+') {
      oldNums.push(null)
      newNums.push(newLine++)
    } else if (l.type === '-') {
      oldNums.push(oldLineCounter(hunk, oldNums))
      newNums.push(null)
    } else if (l.type === ' ') {
      oldNums.push(oldLineCounter(hunk, oldNums))
      newNums.push(newLine++)
    } else {
      oldNums.push(null)
      newNums.push(null)
    }
  }

  const added = hunk.lines.filter((l) => l.type === '+').length
  const removed = hunk.lines.filter((l) => l.type === '-').length
  const pairs = pairLines(hunk)

  return (
    <div className="my-2 overflow-hidden rounded border border-zinc-800 text-xs">
      <div className="flex items-center justify-between bg-zinc-900 px-2 py-1 font-mono text-zinc-500">
        <span>
          {hunk.header}
          {added > 0 && <span className="ml-2 text-emerald-500">+{added}</span>}
          {removed > 0 && <span className="ml-1 text-rose-500">-{removed}</span>}
        </span>
        {action && props.onHunk && (
          <button
            className={`rounded px-2 py-0.5 font-sans ${
              action === 'stage'
                ? 'bg-emerald-800/60 text-emerald-200 hover:bg-emerald-700 hover:text-white'
                : 'bg-amber-800/60 text-amber-200 hover:bg-amber-700 hover:text-amber-900'
            }`}
            onClick={() => props.onHunk?.(props.file, props.index)}
          >
            {action === 'stage' ? t('diff.stageHunk') : t('diff.unstageHunk')}
          </button>
        )}
      </div>

      {split ? (
        <div className="flex divide-x divide-zinc-800 font-mono leading-5">
          <div
            ref={leftRef}
            className="w-1/2 min-w-0 overflow-x-auto"
            onScroll={() => syncScroll('left')}
          >
            <div className="min-w-max">
              {pairs.map((p, idx) => (
                <div
                  key={idx}
                  className={`flex whitespace-pre ${
                    p.minus && p.minus.type === '-'
                      ? 'bg-rose-950/50 text-rose-100'
                      : p.minus
                        ? 'text-zinc-400'
                        : 'bg-zinc-950/40'
                  }`}
                >
                  <span className="w-12 shrink-0 select-none border-r border-zinc-800 px-1 text-right text-zinc-600">
                    {p.oldNum ?? ''}
                  </span>
                  <span className="px-2">
                    {p.minus
                      ? p.minus.type === '-' && p.plus && p.plus.type === '+' && word
                        ? <WordDiffText a={p.minus.content} b={p.plus.content} side="minus" />
                        : (p.minus.content ?? '')
                      : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div
            ref={rightRef}
            className="w-1/2 min-w-0 overflow-x-auto"
            onScroll={() => syncScroll('right')}
          >
            <div className="min-w-max">
              {pairs.map((p, idx) => (
                <div
                  key={idx}
                  className={`flex whitespace-pre ${
                    p.plus && p.plus.type === '+'
                      ? 'bg-emerald-950/50 text-emerald-100'
                      : p.plus
                        ? 'text-zinc-400'
                        : 'bg-zinc-950/40'
                  }`}
                >
                  <span className="w-12 shrink-0 select-none border-r border-zinc-800 px-1 text-right text-zinc-600">
                    {p.newNum ?? ''}
                  </span>
                  <span className="px-2">
                    {p.plus
                      ? p.plus.type === '+' && p.minus && p.minus.type === '-' && word
                        ? <WordDiffText a={p.plus.content} b={p.minus.content} side="plus" />
                        : (p.plus.content ?? '')
                      : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // Unified view: scroll horizontally so long lines stay readable
        // instead of being clipped by the hunk's rounded border.
        <div className="overflow-x-auto">
          <div className="min-w-max font-mono leading-5">
            {hunk.lines.map((l, idx) => {
              const cls =
                l.type === '+'
                  ? 'bg-emerald-950/50 text-emerald-100'
                  : l.type === '-'
                    ? 'bg-rose-950/50 text-rose-100'
                    : l.type === '\\'
                      ? 'text-zinc-600 italic'
                      : 'text-zinc-400'
              return (
                <div key={idx} className={`flex ${cls}`}>
                  <span className="w-12 shrink-0 select-none border-r border-zinc-800 px-1 text-right text-zinc-600">
                    {oldNums[idx] ?? ''}
                  </span>
                  <span className="w-12 shrink-0 select-none border-r border-zinc-800 px-1 text-right text-zinc-600">
                    {newNums[idx] ?? ''}
                  </span>
                  <span className="whitespace-pre px-2">{l.type + (l.content ?? '')}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function oldLineCounter(hunk: DiffHunk, existing: (number | null)[]): number {
  // derive old line number from hunk header + count of consuming lines so far
  let count = 0
  for (const n of existing) if (n !== null) count++
  return hunk.oldStart + count
}

export function DiffView(props: {
  files: DiffFile[]
  loading?: boolean
  hunkAction?: HunkAction
  onHunk?: (file: DiffFile, index: number) => void
}): React.JSX.Element {
  const [split, setSplit] = useState(false)
  const [word, setWord] = useState(true)

  if (props.loading) {
    return <div className="p-4 text-sm text-zinc-500">{t('common.loading')}</div>
  }
  if (props.files.length === 0) {
    return <div className="p-4 text-sm text-zinc-600">{t('diff.empty')}</div>
  }

  return (
    <div className="p-2">
      <div className="mb-2 flex items-center gap-2 text-xs">
        <button
          className={split ? 'rounded bg-zinc-700 px-2 py-1 text-zinc-100' : 'rounded px-2 py-1 text-zinc-500 hover:bg-zinc-800'}
          onClick={() => setSplit((v) => !v)}
        >
          {split ? t('diff.split') : t('diff.unified')}
        </button>
        <button
          className={word ? 'rounded bg-zinc-700 px-2 py-1 text-zinc-100' : 'rounded px-2 py-1 text-zinc-500 hover:bg-zinc-800'}
          onClick={() => setWord((v) => !v)}
        >
          {t('diff.word')}
        </button>
      </div>

      {props.files.map((file, fileIdx) => {
        const added = file.hunks.reduce(
          (n, h) => n + h.lines.filter((l) => l.type === '+').length,
          0
        )
        const removed = file.hunks.reduce(
          (n, h) => n + h.lines.filter((l) => l.type === '-').length,
          0
        )
        return (
          <div key={fileIdx} className="mb-3">
            <div className="mb-1 flex items-center gap-2 rounded bg-zinc-900 px-2 py-1 text-xs">
              <span
                className={`rounded px-1 ${
                  file.status === 'new'
                    ? 'bg-emerald-900/60 text-emerald-300'
                    : file.status === 'deleted'
                      ? 'bg-rose-900/60 text-rose-300'
                      : file.status === 'renamed'
                        ? 'bg-amber-900/60 text-amber-300'
                        : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {file.status === 'new'
                  ? t('diff.new')
                  : file.status === 'deleted'
                    ? t('diff.deleted')
                    : file.status === 'renamed'
                      ? t('diff.rename')
                      : 'M'}
              </span>
              <span className="truncate font-mono text-zinc-300">
                {file.status === 'renamed' && file.origPath ? `${file.origPath} → ${file.path}` : file.path}
              </span>
              <span className="flex-1" />
              <span className="text-emerald-500">+{added}</span>
              <span className="text-rose-500">-{removed}</span>
            </div>
            {file.binary ? (
              <div className="px-2 py-1 text-xs text-zinc-500">{t('diff.binary')}</div>
            ) : file.hunks.length === 0 ? (
              <div className="px-2 py-1 text-xs text-zinc-600">{t('diff.noChanges')}</div>
            ) : (
              file.hunks.map((hunk, hunkIdx) => (
                <HunkView
                  key={hunkIdx}
                  file={file}
                  hunk={hunk}
                  index={hunkIdx}
                  action={props.hunkAction ?? null}
                  onHunk={props.onHunk}
                  split={split}
                  word={word}
                />
              ))
            )}
          </div>
        )
      })}
    </div>
  )
}

// --- image preview -----------------------------------------------------------

export function ImageView(props: {
  repoPath: string
  path: string
  source: 'commit' | 'index' | 'worktree'
  oid?: string
}): React.JSX.Element {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const load = async (): Promise<void> => {
      try {
        const blob =
          props.source === 'commit'
            ? await window.api.gitBlob({
                repoPath: props.repoPath,
                spec: `${props.oid}:${props.path}`
              })
            : props.source === 'index'
              ? await window.api.gitBlob({ repoPath: props.repoPath, spec: `:${props.path}` })
              : await window.api.gitWorktreeFile({ repoPath: props.repoPath, path: props.path })
        if (alive) setUrl(`data:${mimeFor(props.path)};base64,${blob.base64}`)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e))
      }
    }
    void load()
    return () => {
      alive = false
    }
  }, [props.repoPath, props.path, props.source, props.oid])

  if (error) return <div className="p-3 text-xs text-rose-400">{error}</div>
  if (!url) return <div className="p-3 text-xs text-zinc-500">{t('common.loading')}</div>
  return (
    <div className="p-2">
      <div className="mb-1 text-xs text-zinc-500">{t('diff.image')}</div>
      <img src={url} alt={props.path} className="max-h-96 rounded border border-zinc-800" />
    </div>
  )
}

export function EmptyDiff(): React.JSX.Element {
  return (
    <div className="p-4 text-sm text-zinc-600">
      {t('panel.selectFile')}
    </div>
  )
}
